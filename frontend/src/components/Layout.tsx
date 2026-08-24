import { NavLink, Outlet } from "react-router-dom";
import { useWallet } from "../lib/wallet";
import { truncateAddress } from "../lib/format";
import "./Layout.css";

export function Layout() {
  const { address, connecting, error, connect, disconnect } = useWallet();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="page topbar-inner">
          <NavLink to="/" className="brand" end>
            <span className="brand-mark">TL</span>
            <span className="brand-word">
              Trust<span className="brand-accent">Lend</span>
            </span>
          </NavLink>

          <nav className="nav-links">
            <NavLink to="/borrow" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Borrow
            </NavLink>
            <NavLink to="/lend" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Lend
            </NavLink>
          </nav>

          <div className="wallet-slot">
            {address ? (
              <button className="btn btn-ghost" onClick={disconnect} title={address}>
                <span className="mono">{truncateAddress(address)}</span>
              </button>
            ) : (
              <button className="btn btn-brass" onClick={() => void connect()} disabled={connecting}>
                {connecting ? "Connecting…" : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="page">
            <p className="wallet-error">{error}</p>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="page footer-inner">
          <span>TrustLend · Built on Stellar testnet · Green Belt submission</span>
          <a href="https://stellar.org/learn/anchor-basics" target="_blank" rel="noreferrer">
            About Stellar
          </a>
        </div>
      </footer>
    </div>
  );
}
