import { useState } from "react";
import { formatUsd } from "../lib/format";

export function LoanCalculator() {
  const [amount, setAmount] = useState<number>(100);
  const [score, setScore] = useState<number>(600);

  // Simplified logic for calculator (mocking the contract's tiers)
  // Below 300 = rejected.
  // 300-500 = 50% collateral
  // 500-700 = 30% collateral
  // 700+ = 10% collateral
  let collateralPercent = 50;
  if (score >= 700) collateralPercent = 10;
  else if (score >= 500) collateralPercent = 30;
  else if (score < 300) collateralPercent = 0; // Rejected

  const collateralAmount = (amount * collateralPercent) / 100;
  const interestAmount = (amount * 18) / 100; // Fixed 18%
  const totalRepayment = amount + interestAmount;

  return (
    <div className="ledger-card" style={{ marginBottom: "24px" }}>
      <p className="card-label">Loan Calculator</p>
      <h2 className="h2" style={{ fontSize: "1.4rem" }}>Estimate your loan</h2>
      <p className="lede" style={{ marginBottom: "24px", fontSize: "0.95rem" }}>
        Adjust the sliders below to estimate how much collateral you would need based on your credit score.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
        <div style={{ flex: "1 1 300px" }}>
          <div className="field">
            <label>Desired Loan Amount: {formatUsd(amount * 10000000)}</label>
            <input 
              type="range" 
              min="10" 
              max="1000" 
              step="10" 
              value={amount} 
              onChange={(e) => setAmount(Number(e.target.value))} 
            />
          </div>

          <div className="field">
            <label>Estimated Credit Score: {score}</label>
            <input 
              type="range" 
              min="0" 
              max="1000" 
              step="50" 
              value={score} 
              onChange={(e) => setScore(Number(e.target.value))} 
            />
          </div>
        </div>

        <div style={{ flex: "1 1 300px", background: "var(--ink-800)", padding: "16px", borderRadius: "8px", border: "1px solid var(--rule-strong)" }}>
          {score < 300 ? (
            <p style={{ color: "var(--copper-300)" }}>A minimum credit score of 300 is required to request a loan.</p>
          ) : (
            <dl className="hero-seal-stats" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <dt>Required Collateral ({collateralPercent}%)</dt>
                <dd className="figure">{formatUsd(collateralAmount * 10000000)}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <dt>Interest Rate (Fixed)</dt>
                <dd className="figure">18%</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--rule-strong)", paddingTop: "12px" }}>
                <dt style={{ color: "var(--paper)" }}>Total Repayment</dt>
                <dd className="figure" style={{ color: "var(--brass-400)" }}>{formatUsd(totalRepayment * 10000000)}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
