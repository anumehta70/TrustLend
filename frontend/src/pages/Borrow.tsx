import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../lib/wallet";
import { api, type CreditScore, type LoanRecord } from "../lib/api";
import { invokeAsWallet, contractArgs, tokenContractId } from "../lib/contract";
import { toStroops, formatUsd, truncateAddress } from "../lib/format";
import { ScoreSeal } from "../components/ScoreSeal";
import { FeedbackForm } from "../components/FeedbackForm";
import "./Dashboard.css";

type ViewState = "idle" | "loading" | "error";

export function Borrow() {
  const { address, connect, sign } = useWallet();
  const [score, setScore] = useState<CreditScore | null>(null);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [state, setState] = useState<ViewState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const [principal, setPrincipal] = useState("25");

  const refresh = useCallback(async (wallet: string) => {
    setState("loading");
    setError(null);
    try {
      const [scoreRes, loanRes] = await Promise.all([
        api.getScore(wallet).catch(() => null),
        api.getBorrowerLoans(wallet).catch(() => []),
      ]);
      setScore(scoreRes?.score ?? null);
      setLoans(loanRes ?? []);
      setState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load account");
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (address) {
      void api.connectWallet(address, "borrower");
      void refresh(address);
    }
  }, [address, refresh]);

  async function handleSync() {
    if (!address) return;
    setBusy("sync");
    setError(null);
    try {
      await api.syncPayments(address);
      await refresh(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleRequestLoan() {
    if (!address || !score) return;
    setBusy("loan");
    setError(null);
    try {
      const principalStroops = toStroops(Number(principal));
      const collateralStroops = (principalStroops * BigInt(score.min_collateral_bps)) / 10_000n;

      const { hash } = await invokeAsWallet(
        "request_loan",
        [contractArgs.address(address), contractArgs.i128(principalStroops), contractArgs.i128(collateralStroops)],
        address,
        sign
      );

      setLastTx(hash);
      await api.recordLoan({
        loanId: Date.now(), // replaced by indexer reconciliation against the on-chain event in production
        borrower: address,
        principal: principalStroops.toString(),
        collateral: collateralStroops.toString(),
        requestTxHash: hash,
        dueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      });
      await refresh(address);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Loan request failed");
    } finally {
      setBusy(null);
    }
  }

  if (!address) {
    return (
      <section className="page dash-empty">
        <div className="ledger-card">
          <p className="card-label">Borrower dashboard</p>
          <h2 className="h2">Connect your wallet to see your score</h2>
          <p className="lede">TrustLend reads your Stellar payment history straight from the ledger — nothing to fill in by hand.</p>
          <button className="btn btn-brass" onClick={() => void connect()}>
            Connect Wallet
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page dash">
      <div className="dash-head">
        <div>
          <p className="eyebrow">Borrower · {truncateAddress(address)}</p>
          <h1 className="h1" style={{ fontSize: "2.2rem" }}>
            Your ledger, scored
          </h1>
        </div>
        <button className="btn btn-ghost" onClick={handleSync} disabled={busy === "sync"}>
          {busy === "sync" ? "Syncing…" : "Sync payment history"}
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}
      {!tokenContractId && (
        <div className="banner">
          Demo mode — set VITE_CONTRACT_ID and VITE_TOKEN_CONTRACT_ID in frontend/.env to submit real testnet transactions.
        </div>
      )}

      <div className="dash-grid">
        <div className="ledger-card">
          <p className="card-label">Credit seal</p>
          {state === "loading" && !score ? (
            <p className="lede">Reading your ledger…</p>
          ) : score ? (
            <div className="seal-row">
              <ScoreSeal score={score.score} />
              <dl className="hero-seal-stats">
                <div>
                  <dt>Loan ceiling</dt>
                  <dd className="figure">{formatUsd(score.max_loan)}</dd>
                </div>
                <div>
                  <dt>Min. collateral</dt>
                  <dd className="figure">{(score.min_collateral_bps / 100).toFixed(0)}%</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="lede">
              No payment history recorded yet. Sync your wallet above once you've received a
              payment on testnet to establish a score.
            </p>
          )}
        </div>

        <div className="ledger-card">
          <p className="card-label">Request a loan</p>
          <div className="field">
            <label htmlFor="principal">Amount (USDC)</label>
            <input
              id="principal"
              type="number"
              min="1"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
            />
            {score && (
              <span className="hint">
                Collateral required at your score: {formatUsd((toStroops(Number(principal) || 0) * BigInt(score.min_collateral_bps)) / 10_000n)}
              </span>
            )}
          </div>
          <button className="btn btn-brass" onClick={handleRequestLoan} disabled={!score || busy === "loan"}>
            {busy === "loan" ? "Submitting…" : "Sign & request loan"}
          </button>
          {lastTx && (
            <p className="hint" style={{ marginTop: "12px" }}>
              Confirmed · <a href={`https://stellar.expert/explorer/testnet/tx/${lastTx}`} target="_blank" rel="noopener noreferrer" className="mono" style={{ textDecoration: "underline", color: "var(--brand-primary)" }}>{truncateAddress(lastTx, 6)} ↗</a>
            </p>
          )}
        </div>
      </div>

      <div className="ledger-card">
        <p className="card-label">Loan history</p>
        {loans.length === 0 ? (
          <p className="lede">No loans yet — your first will appear here once confirmed on-chain.</p>
        ) : (
          <table className="loan-table">
            <thead>
              <tr>
                <th>Loan</th>
                <th>Principal</th>
                <th>Collateral</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.loanId}>
                  <td className="mono">#{loan.loanId}</td>
                  <td className="figure">{formatUsd(loan.principal)}</td>
                  <td className="figure">{formatUsd(loan.collateral)}</td>
                  <td className="mono">{new Date(loan.dueAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`chip chip-${loan.status}`}>{loan.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <FeedbackForm wallet={address} />
    </section>
  );
}
