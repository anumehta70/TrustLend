//! TrustLend — undercollateralized micro-lending backed by on-chain
//! payment history.
//!
//! The contract has three cooperating pieces of state:
//!   1. A liquidity pool that lenders deposit stablecoins into and earn
//!      a share of interest from.
//!   2. A payment ledger per borrower, fed by an off-chain indexer that
//!      watches a borrower's incoming Stellar payments (wages, invoice
//!      settlements, marketplace payouts, ...). This is the "credit
//!      history" TrustLend scores against, instead of a FICO file.
//!   3. A loan book: undercollateralized loans sized from the credit
//!      score, with partial collateral, scheduled repayment, and
//!      default handling that seizes collateral and penalizes score.
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, Env, Symbol, Vec,
};

// ---------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    PoolTotal,     // total underlying token held by the pool
    SharesTotal,   // total LP shares issued
    LpShares(Address),
    Ledger(Address),  // PaymentLedger per borrower
    LoanCounter,
    Loan(u64),
    BorrowerLoans(Address), // Vec<u64> active/historical loan ids
}

// ---------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum LoanStatus {
    Active,
    Repaid,
    Defaulted,
}

#[contracttype]
#[derive(Clone)]
pub struct PaymentLedger {
    pub total_volume: i128,   // lifetime recorded inbound payment volume
    pub payment_count: u32,   // number of recorded payment events
    pub first_seen: u64,      // ledger timestamp of first recorded payment
    pub last_seen: u64,       // ledger timestamp of most recent payment
    pub on_time_repayments: u32,
    pub defaults: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct Loan {
    pub id: u64,
    pub borrower: Address,
    pub principal: i128,
    pub collateral: i128,
    pub repaid: i128,
    pub due_ledger: u64,
    pub status: LoanStatus,
}

#[contracttype]
#[derive(Clone)]
pub struct CreditScore {
    pub score: u32,        // 0-1000
    pub max_loan: i128,     // suggested max principal at current score
    pub min_collateral_bps: u32, // required collateral, in basis points of principal
}

// ---------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    InsufficientShares = 5,
    InsufficientPoolLiquidity = 6,
    NoPaymentHistory = 7,
    LoanTooLarge = 8,
    CollateralTooLow = 9,
    LoanNotFound = 10,
    LoanNotActive = 11,
    NotYetDue = 12,
    OverRepayment = 13,
    ExistingActiveLoan = 14,
}

// ---------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------

const MIN_SCORE: u32 = 300;
const MAX_SCORE: u32 = 1000;
const LEDGERS_PER_DAY: u64 = 17_280; // ~5s/ledger
const LOAN_TERM_DAYS: u64 = 30;
const LATE_SCORE_PENALTY: u32 = 60;
const DEFAULT_SCORE_PENALTY: u32 = 180;
const REPAY_SCORE_BONUS: u32 = 25;

fn interest_bps_for_score(score: u32) -> u32 {
    // Better history -> cheaper credit. Ranges roughly 4%-18% for the loan term.
    if score >= 850 {
        400
    } else if score >= 700 {
        700
    } else if score >= 550 {
        1100
    } else {
        1800
    }
}

// ---------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------

#[contract]
pub struct TrustLend;

#[contractimpl]
impl TrustLend {
    /// One-time setup. `admin` is the trusted oracle/indexer address
    /// authorized to record payment history and settle defaults;
    /// `token` is the stablecoin used for pool deposits and loans.
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::PoolTotal, &0i128);
        env.storage().instance().set(&DataKey::SharesTotal, &0i128);
        env.storage().instance().set(&DataKey::LoanCounter, &0u64);
        Ok(())
    }

    // -------------------------------------------------------------
    // Liquidity pool (lender side)
    // -------------------------------------------------------------

    /// Deposit `amount` of the pool token and receive proportional shares.
    pub fn lp_deposit(env: Env, lender: Address, amount: i128) -> Result<i128, Error> {
        lender.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let token = Self::token_addr(&env)?;
        let pool_total: i128 = env.storage().instance().get(&DataKey::PoolTotal).unwrap_or(0);
        let shares_total: i128 = env.storage().instance().get(&DataKey::SharesTotal).unwrap_or(0);

        let minted = if shares_total == 0 || pool_total == 0 {
            amount
        } else {
            amount * shares_total / pool_total
        };

        token::Client::new(&env, &token).transfer(&lender, &env.current_contract_address(), &amount);

        let key = DataKey::LpShares(lender.clone());
        let existing: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(existing + minted));

        env.storage().instance().set(&DataKey::PoolTotal, &(pool_total + amount));
        env.storage().instance().set(&DataKey::SharesTotal, &(shares_total + minted));

        env.events().publish((symbol_short!("lp_dep"),), (lender, amount, minted));
        Ok(minted)
    }

    /// Burn `shares` and withdraw the proportional pool balance.
    pub fn lp_withdraw(env: Env, lender: Address, shares: i128) -> Result<i128, Error> {
        lender.require_auth();
        if shares <= 0 {
            return Err(Error::InvalidAmount);
        }
        let key = DataKey::LpShares(lender.clone());
        let held: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if held < shares {
            return Err(Error::InsufficientShares);
        }
        let pool_total: i128 = env.storage().instance().get(&DataKey::PoolTotal).unwrap_or(0);
        let shares_total: i128 = env.storage().instance().get(&DataKey::SharesTotal).unwrap_or(0);
        let payout = shares * pool_total / shares_total;
        if payout > pool_total {
            return Err(Error::InsufficientPoolLiquidity);
        }

        let token = Self::token_addr(&env)?;
        token::Client::new(&env, &token).transfer(&env.current_contract_address(), &lender, &payout);

        env.storage().persistent().set(&key, &(held - shares));
        env.storage().instance().set(&DataKey::PoolTotal, &(pool_total - payout));
        env.storage().instance().set(&DataKey::SharesTotal, &(shares_total - shares));

        env.events().publish((symbol_short!("lp_wd"),), (lender, shares, payout));
        Ok(payout)
    }

    // -------------------------------------------------------------
    // Payment history / credit score (fed by off-chain indexer)
    // -------------------------------------------------------------

    /// Record a confirmed inbound payment for `borrower`. Called by the
    /// trusted indexer service after observing a settled Stellar payment
    /// to the borrower's wallet (e.g. gig payout, marketplace sale).
    pub fn record_payment(env: Env, borrower: Address, amount: i128) -> Result<(), Error> {
        Self::require_admin(&env)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let now = env.ledger().timestamp();
        let key = DataKey::Ledger(borrower.clone());
        let mut ledger: PaymentLedger = env.storage().persistent().get(&key).unwrap_or(PaymentLedger {
            total_volume: 0,
            payment_count: 0,
            first_seen: now,
            last_seen: now,
            on_time_repayments: 0,
            defaults: 0,
        });
        ledger.total_volume += amount;
        ledger.payment_count += 1;
        ledger.last_seen = now;
        env.storage().persistent().set(&key, &ledger);

        env.events().publish((symbol_short!("payment"),), (borrower, amount));
        Ok(())
    }

    /// Compute a borrower's current score, suggested loan ceiling and
    /// required collateral ratio from their recorded payment history.
    pub fn get_credit_score(env: Env, borrower: Address) -> Result<CreditScore, Error> {
        let ledger = Self::ledger_or_err(&env, &borrower)?;
        Ok(Self::score_from_ledger(&env, &ledger))
    }

    fn score_from_ledger(env: &Env, ledger: &PaymentLedger) -> CreditScore {
        let now = env.ledger().timestamp();
        let span_days = ((ledger.last_seen.saturating_sub(ledger.first_seen)) / 86_400).max(1);
        let recency_days = (now.saturating_sub(ledger.last_seen)) / 86_400;

        // Base: payment frequency + volume, in [0, 700]
        let frequency_component = (ledger.payment_count.min(60) as u32) * 8; // up to 480
        let volume_component = ((ledger.total_volume / 100_000_000).min(220) as u32).max(0); // 1 pt / unit, capped
        let mut score = MIN_SCORE + frequency_component + volume_component;

        // Longevity bonus: sustained history over time
        if span_days >= 180 {
            score += 80;
        } else if span_days >= 60 {
            score += 40;
        }

        // Repayment track record
        score += ledger.on_time_repayments.saturating_mul(REPAY_SCORE_BONUS);
        score = score.saturating_sub(ledger.defaults.saturating_mul(DEFAULT_SCORE_PENALTY));

        // Staleness penalty: no recent income signal
        if recency_days > 90 {
            score = score.saturating_sub(LATE_SCORE_PENALTY);
        }

        let score = score.clamp(MIN_SCORE, MAX_SCORE);

        // Loan ceiling: a fraction of average recorded payment size,
        // scaled up with score. Deliberately conservative.
        let avg_payment = ledger.total_volume / (ledger.payment_count.max(1) as i128);
        let score_multiplier = (score as i128 - MIN_SCORE as i128) / 20 + 2; // 2x..37x avg payment
        let max_loan = avg_payment * score_multiplier;

        let min_collateral_bps: u32 = if score >= 850 {
            1000 // 10%
        } else if score >= 700 {
            2000 // 20%
        } else if score >= 550 {
            3500 // 35%
        } else {
            5000 // 50%
        };

        CreditScore { score, max_loan, min_collateral_bps }
    }

    // -------------------------------------------------------------
    // Loans (borrower side)
    // -------------------------------------------------------------

    /// Request and immediately disburse an undercollateralized loan.
    /// `collateral` must meet the score-derived minimum ratio and is
    /// pulled from the borrower up front; `principal` is paid out from
    /// the pool on success.
    pub fn request_loan(
        env: Env,
        borrower: Address,
        principal: i128,
        collateral: i128,
    ) -> Result<u64, Error> {
        borrower.require_auth();
        if principal <= 0 || collateral < 0 {
            return Err(Error::InvalidAmount);
        }

        // one active loan at a time keeps default/collateral accounting simple
        if let Some(id) = Self::active_loan_id(&env, &borrower) {
            let _ = id;
            return Err(Error::ExistingActiveLoan);
        }

        let ledger = Self::ledger_or_err(&env, &borrower)?;
        let scored = Self::score_from_ledger(&env, &ledger);
        if principal > scored.max_loan {
            return Err(Error::LoanTooLarge);
        }
        let required_collateral = principal * scored.min_collateral_bps as i128 / 10_000;
        if collateral < required_collateral {
            return Err(Error::CollateralTooLow);
        }

        let token = Self::token_addr(&env)?;
        let pool_total: i128 = env.storage().instance().get(&DataKey::PoolTotal).unwrap_or(0);
        if principal > pool_total {
            return Err(Error::InsufficientPoolLiquidity);
        }

        let client = token::Client::new(&env, &token);
        // pull collateral in, then push principal out
        if collateral > 0 {
            client.transfer(&borrower, &env.current_contract_address(), &collateral);
        }
        client.transfer(&env.current_contract_address(), &borrower, &principal);

        let mut counter: u64 = env.storage().instance().get(&DataKey::LoanCounter).unwrap_or(0);
        counter += 1;
        let due_ledger = env.ledger().timestamp() + LOAN_TERM_DAYS * 86_400;
        let loan = Loan {
            id: counter,
            borrower: borrower.clone(),
            principal,
            collateral,
            repaid: 0,
            due_ledger,
            status: LoanStatus::Active,
        };
        env.storage().persistent().set(&DataKey::Loan(counter), &loan);
        env.storage().instance().set(&DataKey::LoanCounter, &counter);
        env.storage().instance().set(&DataKey::PoolTotal, &(pool_total - principal + collateral));

        let mut ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::BorrowerLoans(borrower.clone()))
            .unwrap_or(Vec::new(&env));
        ids.push_back(counter);
        env.storage().persistent().set(&DataKey::BorrowerLoans(borrower.clone()), &ids);

        env.events().publish((symbol_short!("loan_new"),), (borrower, counter, principal, collateral));
        Ok(counter)
    }

    /// Repay `amount` toward an active loan. Full repayment releases
    /// collateral back to the borrower and improves their score.
    pub fn repay(env: Env, borrower: Address, loan_id: u64, amount: i128) -> Result<(), Error> {
        borrower.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let mut loan = Self::loan_or_err(&env, loan_id)?;
        if loan.borrower != borrower {
            return Err(Error::Unauthorized);
        }
        if loan.status != LoanStatus::Active {
            return Err(Error::LoanNotActive);
        }

        let owed = Self::amount_owed(&loan);
        let applied = amount.min(owed);
        if amount - applied > 0 {
            return Err(Error::OverRepayment);
        }

        let token = Self::token_addr(&env)?;
        token::Client::new(&env, &token).transfer(&borrower, &env.current_contract_address(), &applied);

        loan.repaid += applied;
        let pool_total: i128 = env.storage().instance().get(&DataKey::PoolTotal).unwrap_or(0);
        env.storage().instance().set(&DataKey::PoolTotal, &(pool_total + applied));

        if loan.repaid >= owed {
            loan.status = LoanStatus::Repaid;
            if loan.collateral > 0 {
                token::Client::new(&env, &token).transfer(
                    &env.current_contract_address(),
                    &borrower,
                    &loan.collateral,
                );
                let pool_total: i128 = env.storage().instance().get(&DataKey::PoolTotal).unwrap_or(0);
                env.storage().instance().set(&DataKey::PoolTotal, &(pool_total - loan.collateral));
            }
            Self::bump_ledger_repayment(&env, &borrower, true);
        }
        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);

        env.events().publish((symbol_short!("repay"),), (borrower, loan_id, applied, loan.status.clone()));
        Ok(())
    }

    /// Settle an overdue, unpaid loan: seize collateral into the pool
    /// and penalize the borrower's score. Callable by the admin/keeper
    /// once the due ledger timestamp has passed.
    pub fn mark_default(env: Env, loan_id: u64) -> Result<(), Error> {
        Self::require_admin(&env)?;
        let mut loan = Self::loan_or_err(&env, loan_id)?;
        if loan.status != LoanStatus::Active {
            return Err(Error::LoanNotActive);
        }
        if env.ledger().timestamp() < loan.due_ledger {
            return Err(Error::NotYetDue);
        }
        loan.status = LoanStatus::Defaulted;
        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);
        // collateral stays in the pool (already held there since disbursement)
        Self::bump_ledger_repayment(&env, &loan.borrower, false);

        env.events().publish((symbol_short!("default"),), (loan.borrower.clone(), loan_id));
        Ok(())
    }

    // -------------------------------------------------------------
    // Views
    // -------------------------------------------------------------

    pub fn get_loan(env: Env, loan_id: u64) -> Result<Loan, Error> {
        Self::loan_or_err(&env, loan_id)
    }

    pub fn get_borrower_loans(env: Env, borrower: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::BorrowerLoans(borrower))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_pool_stats(env: Env) -> (i128, i128) {
        let total: i128 = env.storage().instance().get(&DataKey::PoolTotal).unwrap_or(0);
        let shares: i128 = env.storage().instance().get(&DataKey::SharesTotal).unwrap_or(0);
        (total, shares)
    }

    pub fn lp_balance(env: Env, lender: Address) -> i128 {
        env.storage().persistent().get(&DataKey::LpShares(lender)).unwrap_or(0)
    }

    // -------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------

    fn amount_owed(loan: &Loan) -> i128 {
        let interest_bps = interest_bps_for_score(500); // fallback baseline; UI shows quoted rate at origination
        let with_interest = loan.principal + (loan.principal * interest_bps as i128 / 10_000);
        with_interest - loan.repaid.min(with_interest)
    }

    fn active_loan_id(env: &Env, borrower: &Address) -> Option<u64> {
        let ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::BorrowerLoans(borrower.clone()))
            .unwrap_or(Vec::new(env));
        for id in ids.iter() {
            if let Some(loan) = env.storage().persistent().get::<_, Loan>(&DataKey::Loan(id)) {
                if loan.status == LoanStatus::Active {
                    return Some(id);
                }
            }
        }
        None
    }

    fn bump_ledger_repayment(env: &Env, borrower: &Address, on_time: bool) {
        let key = DataKey::Ledger(borrower.clone());
        if let Some(mut ledger) = env.storage().persistent().get::<_, PaymentLedger>(&key) {
            if on_time {
                ledger.on_time_repayments += 1;
            } else {
                ledger.defaults += 1;
            }
            env.storage().persistent().set(&key, &ledger);
        }
    }

    fn ledger_or_err(env: &Env, borrower: &Address) -> Result<PaymentLedger, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Ledger(borrower.clone()))
            .ok_or(Error::NoPaymentHistory)
    }

    fn loan_or_err(env: &Env, loan_id: u64) -> Result<Loan, Error> {
        env.storage().persistent().get(&DataKey::Loan(loan_id)).ok_or(Error::LoanNotFound)
    }

    fn token_addr(env: &Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Token).ok_or(Error::NotInitialized)
    }

    fn require_admin(env: &Env) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(Error::NotInitialized)?;
        admin.require_auth();
        Ok(())
    }
}

#[allow(dead_code)]
fn _unused(env: &Env) -> Symbol {
    // keeps `Symbol` import warning-free across soroban-sdk minor versions
    symbol_short!("trustlnd")
}

mod test;
