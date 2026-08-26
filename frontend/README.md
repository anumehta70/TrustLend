# TrustLend frontend

React + Vite + TypeScript dashboard for borrowers and lenders.

## Pages

- `/` — landing page: pitch, "how a loan gets sized", why Stellar
- `/borrow` — connect wallet, sync payment history, view credit seal, request
  a loan (signed with Freighter), view loan history, leave feedback
- `/lend` — connect wallet, view pool stats, deposit/withdraw liquidity

## Design system

See `src/styles/tokens.css` for the full token set. Concept: a hand-kept
field ledger — deep ink-teal pages, a brass stamp/seal for approvals,
`Fraunces` for display numerals, `IBM Plex Mono` for anything that's data
(scores, amounts, tx hashes, table figures). The signature element is the
animated `LedgerStrip` tape — a running transaction log used on the landing
page hero.

## Wallet integration

Uses `@stellar/freighter-api` directly (no wallet-kit abstraction) so the
signing flow is easy to audit: `src/lib/wallet.tsx` wraps `requestAccess` /
`signTransaction`, and `src/lib/contract.ts` builds, signs, and submits
Soroban contract calls (`lp_deposit`, `lp_withdraw`, `request_loan`) using
the connected wallet as the transaction source — the backend never touches
a borrower or lender's keys.

## Setup

```bash
cp .env.example .env   # fill in VITE_CONTRACT_ID, VITE_TOKEN_CONTRACT_ID
npm install
npm run dev
npm run typecheck
npm run build           # production build to dist/
```

Requires the [Freighter](https://freighter.app) extension set to Testnet.
