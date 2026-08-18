#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};
use soroban_sdk::token::StellarAssetClient;

fn setup(env: &Env) -> (Address, Address, TrustLendClient, StellarAssetClient) {
    let admin = Address::generate(env);
    let token_admin = Address::generate(env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_id = token_contract.address();

    let contract_id = env.register(TrustLend, ());
    let client = TrustLendClient::new(env, &contract_id);
    client.initialize(&admin, &token_id);

    let asset_client = StellarAssetClient::new(env, &token_id);
    (admin, token_id, client, asset_client)
}

fn advance_days(env: &Env, days: u64) {
    let now = env.ledger().timestamp();
    env.ledger().set(LedgerInfo {
        timestamp: now + days * 86_400,
        protocol_version: env.ledger().protocol_version(),
        sequence_number: env.ledger().sequence(),
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100_000,
        min_persistent_entry_ttl: 100_000,
        max_entry_ttl: 1_000_000,
    });
}

#[test]
fn lp_deposit_and_withdraw_round_trips() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, _token, client, asset) = setup(&env);

    let lender = Address::generate(&env);
    asset.mint(&lender, &1_000_0000000);

    let shares = client.lp_deposit(&lender, &500_0000000);
    assert_eq!(shares, 500_0000000);
    assert_eq!(client.lp_balance(&lender), 500_0000000);

    let (pool_total, shares_total) = client.get_pool_stats();
    assert_eq!(pool_total, 500_0000000);
    assert_eq!(shares_total, 500_0000000);

    let payout = client.lp_withdraw(&lender, &200_0000000);
    assert_eq!(payout, 200_0000000);
    assert_eq!(client.lp_balance(&lender), 300_0000000);
}

#[test]
fn credit_score_rises_with_recorded_payments() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, _token, client, _asset) = setup(&env);

    let borrower = Address::generate(&env);
    for _ in 0..10 {
        client.record_payment(&borrower, &50_0000000);
        advance_days(&env, 3);
    }
    let _ = admin;

    let score = client.get_credit_score(&borrower);
    assert!(score.score > MIN_SCORE, "score should climb above the floor");
    assert!(score.max_loan > 0, "borrower with history should get a nonzero ceiling");
}

#[test]
fn borrower_without_history_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, _token, client, _asset) = setup(&env);

    let borrower = Address::generate(&env);
    let result = client.try_get_credit_score(&borrower);
    assert!(result.is_err());
}

#[test]
fn full_loan_lifecycle_disburse_and_repay() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, _token, client, asset) = setup(&env);

    let lender = Address::generate(&env);
    asset.mint(&lender, &10_000_0000000);
    client.lp_deposit(&lender, &10_000_0000000);

    let borrower = Address::generate(&env);
    asset.mint(&borrower, &1_000_0000000);
    for _ in 0..12 {
        client.record_payment(&borrower, &40_0000000);
        advance_days(&env, 5);
    }

    let score = client.get_credit_score(&borrower);
    let principal = 50_0000000i128.min(score.max_loan);
    let collateral = principal * score.min_collateral_bps as i128 / 10_000;

    let loan_id = client.request_loan(&borrower, &principal, &collateral);
    let loan = client.get_loan(&loan_id);
    assert_eq!(loan.status, LoanStatus::Active);
    assert_eq!(loan.principal, principal);

    // repay in two installments, final one clears the loan
    let owed = TrustLend::amount_owed(&loan);
    let first = owed / 2;
    client.repay(&borrower, &loan_id, &first);
    client.repay(&borrower, &loan_id, &(owed - first));

    let loan = client.get_loan(&loan_id);
    assert_eq!(loan.status, LoanStatus::Repaid);

    let updated_score = client.get_credit_score(&borrower);
    assert!(updated_score.score >= score.score, "on-time repayment should not lower score");
}

#[test]
fn loan_request_rejected_when_undercollateralized() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, _token, client, asset) = setup(&env);

    let lender = Address::generate(&env);
    asset.mint(&lender, &10_000_0000000);
    client.lp_deposit(&lender, &10_000_0000000);

    let borrower = Address::generate(&env);
    asset.mint(&borrower, &1_000_0000000);
    for _ in 0..8 {
        client.record_payment(&borrower, &30_0000000);
        advance_days(&env, 4);
    }

    let score = client.get_credit_score(&borrower);
    let principal = 20_0000000i128.min(score.max_loan);
    let too_little_collateral = 1i128; // far below required bps

    let result = client.try_request_loan(&borrower, &principal, &too_little_collateral);
    assert!(result.is_err());
}

#[test]
fn overdue_unpaid_loan_can_be_marked_defaulted() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, _token, client, asset) = setup(&env);

    let lender = Address::generate(&env);
    asset.mint(&lender, &10_000_0000000);
    client.lp_deposit(&lender, &10_000_0000000);

    let borrower = Address::generate(&env);
    asset.mint(&borrower, &1_000_0000000);
    for _ in 0..8 {
        client.record_payment(&borrower, &30_0000000);
        advance_days(&env, 4);
    }
    let score = client.get_credit_score(&borrower);
    let principal = 10_0000000i128.min(score.max_loan);
    let collateral = principal * score.min_collateral_bps as i128 / 10_000;
    let loan_id = client.request_loan(&borrower, &principal, &collateral);

    advance_days(&env, 31); // past the 30-day term

    client.mark_default(&loan_id);
    let loan = client.get_loan(&loan_id);
    assert_eq!(loan.status, LoanStatus::Defaulted);
}
