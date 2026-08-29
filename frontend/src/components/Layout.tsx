import { NavLink, Outlet } from "react-router-dom";
import { useWallet } from "../lib/wallet";
import { useTheme } from "../lib/ThemeContext";
import { truncateAddress } from "../lib/format";
import "./Layout.css";

export function Layout() {
  const { address, connecting, error, connect, disconnect } = useWallet();
  const { theme, toggleTheme } = useTheme();

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

          <div className="wallet-slot" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn btn-ghost" onClick={toggleTheme} style={{ padding: '8px', minWidth: '40px' }} title="Toggle Theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
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

      <button
        className="btn btn-brass"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          borderRadius: '50px',
          padding: '12px 24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}
        onClick={() => alert('Live Chat Support coming soon!')}
      >
        💬 Live Chat
      </button>
    </div>
  );
}
