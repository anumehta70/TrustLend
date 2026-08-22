# TrustLend backend

Express/TypeScript API sitting between the frontend, MongoDB, and the
Soroban contract.

## Responsibilities

- **Indexing** — `services/creditIndexer.ts` reads a wallet's confirmed
  inbound payments from Horizon and forwards new ones to the contract's
  `record_payment` via the admin/indexer identity.
- **Reads** — proxies on-chain views (`get_credit_score`, `get_loan`,
  `get_pool_stats`) so the frontend doesn't need its own RPC round trip for
  every read.
- **Off-chain indexing of loans/users/feedback** — Mongo-backed so
  dashboards and the onboarding/traction proof required for submission
  don't depend on re-scanning the chain each time.
- **Observability** — Sentry for errors, PostHog for product analytics,
  winston for structured logs.

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | liveness + DB status |
| GET | `/api/score/:wallet` | current credit score |
| POST | `/api/score/:wallet/sync` | pull new Horizon payments into the on-chain ledger |
| POST | `/api/loans` | index a confirmed loan tx (frontend calls after signing) |
| GET | `/api/loans/borrower/:wallet` | a borrower's loan history |
| GET | `/api/loans/:loanId` | on-chain loan detail |
| PATCH | `/api/loans/:loanId/status` | manual status correction |
| POST | `/api/loans/:loanId/default` | admin: settle an overdue loan |
| GET | `/api/pool/stats` | pool total + shares |
| POST | `/api/users/connect` | record a wallet connection (onboarding proof) |
| GET | `/api/users` | list onboarded wallets |
| POST | `/api/users/feedback` | submit feedback |
| GET | `/api/users/feedback` | feedback summary |

## Setup

```bash
cp .env.example .env
npm install
npm run dev      # tsx watch, no build step needed
npm run typecheck
npm run build && npm start   # production
```
