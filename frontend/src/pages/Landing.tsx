import { Link } from "react-router-dom";
import { LedgerStrip } from "../components/LedgerStrip";
import { ScoreSeal } from "../components/ScoreSeal";
import "./Landing.css";

const tapeEntries = [
  { no: 1042, label: "wages · Lagos market co-op", amount: "38.00", direction: "in" as const },
  { no: 1043, label: "loan disbursed · repair capital", amount: "120.00", direction: "out" as const },
  { no: 1044, label: "harvest payout · maize lot 12", amount: "64.50", direction: "in" as const },
  { no: 1045, label: "repayment · loan #1043", amount: "31.00", direction: "in" as const },
  { no: 1046, label: "gig payout · delivery route", amount: "22.75", direction: "in" as const },
  { no: 1047, label: "loan disbursed · inventory restock", amount: "85.00", direction: "out" as const },
];

export function Landing() {
  return (
    <>
      <section className="page hero">
        <div className="hero-copy">
          <p className="eyebrow">Undercollateralized credit on Stellar</p>
          <h1 className="h1">
            Your ledger
            <br />
            is your credit file.
          </h1>
          <p className="lede">
            TrustLend reads the payments you already receive on Stellar — gig payouts,
            harvest sales, marketplace settlements — and turns that history into a loan
            you can actually qualify for. No bank statement, no bureau, no collateral
            you don't have.
          </p>
          <div className="hero-actions">
            <Link to="/borrow" className="btn btn-brass">
              Check my score
            </Link>
            <Link to="/lend" className="btn btn-ghost">
              Supply liquidity
            </Link>
          </div>
        </div>

        <div className="hero-seal ledger-card">
          <p className="card-label">Sample borrower</p>
          <div className="hero-seal-row">
            <ScoreSeal score={742} />
            <dl className="hero-seal-stats">
              <div>
                <dt>Suggested ceiling</dt>
                <dd className="figure">$310</dd>
              </div>
              <div>
                <dt>Collateral required</dt>
                <dd className="figure">20%</dd>
              </div>
              <div>
                <dt>History span</dt>
                <dd className="figure">6 mo</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <LedgerStrip entries={tapeEntries} />

      <section className="page how">
        <p className="eyebrow">How a loan gets sized</p>
        <h2 className="h2">Three entries in the ledger</h2>
        <div className="how-grid">
          <div className="ledger-card how-step">
            <p className="card-label">Entry one</p>
            <h3>Your income gets indexed</h3>
            <p>
              Connect your wallet and TrustLend's indexer reads your confirmed inbound
              Stellar payments — how often you're paid, how much, and for how long.
            </p>
          </div>
          <div className="ledger-card how-step">
            <p className="card-label">Entry two</p>
            <h3>A score comes back</h3>
            <p>
              Frequency, volume, and longevity combine into a 300–1000 score, plus a
              suggested loan ceiling and the collateral ratio it unlocks — as low as 10%.
            </p>
          </div>
          <div className="ledger-card how-step">
            <p className="card-label">Entry three</p>
            <h3>Borrow, repay, improve</h3>
            <p>
              Post the required collateral, draw the loan, and repay on schedule. Each
              on-time repayment strengthens the score for the next, larger loan.
            </p>
          </div>
        </div>
      </section>

      <section className="page why">
        <div className="ledger-card why-card">
          <p className="card-label">Why Stellar</p>
          <h2 className="h2">Cheap enough for loans this small</h2>
          <p className="lede">
            A $20 working-capital loan doesn't survive gas fees on most chains. Stellar
            settles in seconds for a fraction of a cent, so micro-loans stay economical
            for both the borrower and the lending pool — and the same payment rails
            that fund the loan are what generate the credit history behind it.
          </p>
        </div>
      </section>
    </>
  );
}
