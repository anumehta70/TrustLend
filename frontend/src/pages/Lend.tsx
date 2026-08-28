import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../lib/wallet";
import { api } from "../lib/api";
import { invokeAsWallet, contractArgs } from "../lib/contract";
import { toStroops, formatUsd, truncateAddress } from "../lib/format";
import { FeedbackForm } from "../components/FeedbackForm";
import "./Dashboard.css";

export function Lend() {
  const { address, connect, sign } = useWallet();
  const [poolTotal, setPoolTotal] = useState<string | null>(null);
  const [sharesTotal, setSharesTotal] = useState<string | null>(null);
  const [amount, setAmount] = useState("500");
  const [busy, setBusy] = useState<"deposit" | "withdraw" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const refreshPool = useCallback(async () => {
    try {
      const { stats } = await api.getPoolStats();
      setPoolTotal(stats?.[0] ?? "0");
      setSharesTotal(stats?.[1] ?? "0");
    } catch {
      setPoolTotal(null);
      setSharesTotal(null);
    }
  }, []);

  useEffect(() => {
    void refreshPool();
  }, [refreshPool]);

  useEffect(() => {
    if (address) void api.connectWallet(address, "lender");
  }, [address]);

  async function handleDeposit() {
    if (!address) return;
    setBusy("deposit");
    setError(null);
    try {
      const stroops = toStroops(Number(amount));
      const { hash } = await invokeAsWallet(
        "lp_deposit",
        [contractArgs.address(address), contractArgs.i128(stroops)],
        address,
        sign
      );
      setLastTx(hash);
      await refreshPool();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleWithdraw() {
    if (!address) return;
    setBusy("withdraw");
    setError(null);
    try {
      const stroops = toStroops(Number(amount));
      const { hash } = await invokeAsWallet(
        "lp_withdraw",
        [contractArgs.address(address), contractArgs.i128(stroops)],
        address,
        sign
      );
      setLastTx(hash);
      await refreshPool();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdraw failed");
    } finally {
      setBusy(null);
    }
  }

  if (!address) {
    return (
      <section className="page dash-empty">
        <div className="ledger-card">
          <p className="card-label">Lender dashboard</p>
          <h2 className="h2">Connect your wallet to supply liquidity</h2>
          <p className="lede">Deposit stablecoins into the pool and earn a share of the interest borrowers repay.</p>
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
          <p className="eyebrow">Lender · {truncateAddress(address)}</p>
          <h1 className="h1" style={{ fontSize: "2.2rem" }}>
            Supply the pool
          </h1>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="dash-grid">
        <div className="ledger-card">
          <p className="card-label">Pool</p>
          <dl className="hero-seal-stats">
            <div>
              <dt>Total liquidity</dt>
              <dd className="figure">{poolTotal ? formatUsd(poolTotal) : "—"}</dd>
            </div>
            <div>
              <dt>Shares issued</dt>
              <dd className="figure">{sharesTotal ? formatUsd(sharesTotal) : "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="ledger-card">
          <p className="card-label">Deposit or withdraw</p>
          <div className="field">
            <label htmlFor="amount">Amount (USDC)</label>
            <input id="amount" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="dash-actions">
            <button className="btn btn-brass" onClick={handleDeposit} disabled={busy !== null}>
              {busy === "deposit" ? "Depositing…" : "Deposit"}
            </button>
            <button className="btn btn-ghost" onClick={handleWithdraw} disabled={busy !== null}>
              {busy === "withdraw" ? "Withdrawing…" : "Withdraw"}
            </button>
          </div>
          {lastTx && (
            <p className="hint" style={{ marginTop: "12px" }}>
              Confirmed · <a href={`https://stellar.expert/explorer/testnet/tx/${lastTx}`} target="_blank" rel="noopener noreferrer" className="mono" style={{ textDecoration: "underline", color: "var(--brand-primary)" }}>{truncateAddress(lastTx, 6)} ↗</a>
            </p>
          )}
        </div>
      </div>

      <FeedbackForm wallet={address} />
    </section>
  );
}
