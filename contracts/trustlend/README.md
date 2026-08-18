# TrustLend contract

Soroban contract implementing the lending pool, on-chain payment ledger,
credit scoring, and loan lifecycle described in the root README.

## Prerequisites

- Rust with the `wasm32-unknown-unknown` target
- [`soroban-cli`](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli) / `stellar-cli`
- A funded testnet identity for the admin/indexer role

```bash
rustup target add wasm32-unknown-unknown
cargo install --locked soroban-cli --features opt
```

> This repo was built in a sandbox without a Rust toolchain, so `cargo test`
> and the wasm build have not been run here — run them locally before
> submission (see Level 4 technical standards).

## Test

```bash
cd contracts/trustlend
cargo test
```

## Build

```bash
soroban contract build
```

Output wasm lands at `target/wasm32-unknown-unknown/release/trustlend.wasm`.

## Deploy to testnet

```bash
soroban keys generate admin --network testnet
soroban keys fund admin --network testnet

# Deploy a test USDC-like token (or use an existing testnet asset's SAC)
TOKEN_ID=$(soroban contract asset deploy \
  --asset USDC:GA... \
  --source admin --network testnet)

CONTRACT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/trustlend.wasm \
  --source admin --network testnet)

soroban contract invoke \
  --id $CONTRACT_ID --source admin --network testnet \
  -- initialize --admin $(soroban keys address admin) --token $TOKEN_ID
```

Copy `$CONTRACT_ID` and `$TOKEN_ID` into `backend/.env` (`CONTRACT_ID`,
`TOKEN_CONTRACT_ID`) and `frontend/.env` (`VITE_CONTRACT_ID`,
`VITE_TOKEN_CONTRACT_ID`), and put the admin identity's secret key into
`backend/.env` as `INDEXER_SECRET` — the backend uses it to call
`record_payment` and `mark_default`.

## Contract surface

| Function | Caller | Effect |
|---|---|---|
| `initialize(admin, token)` | admin | one-time setup |
| `lp_deposit(lender, amount)` | lender | mints pool shares |
| `lp_withdraw(lender, shares)` | lender | burns shares, returns funds |
| `record_payment(borrower, amount)` | admin (indexer) | appends to the borrower's payment ledger |
| `get_credit_score(borrower)` | any | reads score, loan ceiling, collateral ratio |
| `request_loan(borrower, principal, collateral)` | borrower | disburses an undercollateralized loan |
| `repay(borrower, loan_id, amount)` | borrower | pays down a loan, releases collateral on full repayment |
| `mark_default(loan_id)` | admin (keeper) | settles an overdue loan, seizes collateral |
| `get_loan` / `get_borrower_loans` / `get_pool_stats` / `lp_balance` | any | views |
