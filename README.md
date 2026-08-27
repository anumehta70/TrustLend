# TrustLend

**Undercollateralized micro-loans on Stellar, sized from your real on-chain payment history.**

Gig workers, small farmers, and micro-merchants in emerging markets often have
steady income but no formal credit history — locking them out of loans or
pushing them toward predatory local lenders. TrustLend turns a borrower's
verifiable, tamper-proof Stellar payment history into a credit score a
Soroban contract can lend against, with partial collateral instead of full
collateral or a bureau file.

Built for the Stellar Builder Track — Level 4 / Green Belt submission.

---

## How it works

1. **Payment indexing.** An off-chain indexer watches a borrower's wallet on
   Horizon for confirmed inbound payments and records them into the
   contract's on-chain payment ledger via `record_payment`.
2. **Scoring.** `get_credit_score` derives a 300–1000 score from payment
   frequency, volume, longevity, and repayment history, plus a suggested
   loan ceiling and the minimum collateral ratio it unlocks (10%–50%).
3. **Lending.** Lenders deposit stablecoins into a pool (`lp_deposit`) and
   earn a share of interest. Borrowers post the required collateral and
   draw a loan (`request_loan`) sized against their score.
4. **Repayment.** Borrowers repay on-chain (`repay`); full repayment
   releases collateral and improves the score. Unpaid overdue loans can be
   settled by the admin/keeper (`mark_default`), which seizes collateral
   and applies a score penalty.

## Why Stellar

Stellar settles in ~5 seconds for fractions of a cent, which is what makes
loans this small (think $10–$50) economically viable — gas alone would
exceed the loan value on most other chains. The same low-fee payment rails
that make Stellar useful for gig payouts and marketplace settlements are
also the income signal TrustLend scores against, so the credit primitive
falls directly out of Stellar's existing strengths rather than requiring a
separate off-chain identity or credit-bureau integration.

## Architecture

```
contracts/trustlend/   Soroban contract: pool, payment ledger, scoring, loans
backend/                Express/TypeScript API: indexer, score/loan routes,
                        Mongo persistence, Sentry + PostHog
frontend/               React/Vite dashboard: borrower + lender flows,
                        Freighter wallet integration, on-chain calls
```

**Data flow:** borrower's Stellar payments → Horizon → indexer →
`record_payment` on-chain → `get_credit_score` → borrower requests a loan
signed with their own wallet (Freighter) → contract disburses from the pool
→ backend indexes the loan for dashboards → borrower repays on-chain →
score updates for the next loan.

## Repository layout

```
trustlend/
├── contracts/trustlend/   Rust/Soroban smart contract + tests
├── backend/               Express API, Mongo models, Soroban RPC client, indexer
├── frontend/              React/Vite dashboard (borrower + lender)
└── docs/                  Screenshots, demo notes
```

## Running locally

### 1. Contract

See `contracts/trustlend/README.md` for build/test/deploy steps. You need a
Rust toolchain with the `wasm32-unknown-unknown` target and `soroban-cli` —
this was not available in the build sandbox, so run `cargo test` locally
before submitting.

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill in CONTRACT_ID, TOKEN_CONTRACT_ID, INDEXER_SECRET
npm install
npm run dev
```

Requires a MongoDB instance (`MONGODB_URI`) — a local `mongod` or a free
Atlas cluster both work.

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # fill in VITE_CONTRACT_ID, VITE_TOKEN_CONTRACT_ID
npm install
npm run dev
```

Open the printed local URL. You'll need the [Freighter](https://freighter.app)
browser extension set to Testnet to connect a wallet.

## Design

The UI is a "field ledger" — the deep ink-teal and brass palette, the
`Fraunces`/`IBM Plex Mono` type pairing, and the animated ledger-tape
signature element are all deliberate references to a hand-kept account
book, since that's literally what the product replaces. Details in
`frontend/src/styles/tokens.css`.

## What's left before submission

These require real deployment and can't be fabricated:

- [ ] Deploy contract + token to testnet, wire real `CONTRACT_ID` /
      `TOKEN_CONTRACT_ID` into both `.env` files
- [ ] Run `cargo test` locally/CI and capture output for the README
- [ ] Onboard 10+ real wallets (borrower + lender), each with a signed
      on-chain transaction (`lp_deposit`, `request_loan`, or `repay`)
- [ ] Collect real feedback via the in-app form (`/api/users/feedback`)
- [ ] Stand up Sentry + PostHog projects and drop the keys into `backend/.env`
      and `frontend/.env`
- [ ] Record the demo video and capture the screenshots listed in the
      submission checklist (product UI, mobile view, analytics dashboard)
- [ ] Push to a public GitHub repo with the full commit history included
      in this zip
