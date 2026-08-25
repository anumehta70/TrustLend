import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section className="page dash-empty">
      <div className="ledger-card">
        <p className="card-label">Entry not found</p>
        <h2 className="h2">This page isn't in the ledger.</h2>
        <p className="lede">Nothing was recorded at this address.</p>
        <Link to="/" className="btn btn-brass">
          Back to start
        </Link>
      </div>
    </section>
  );
}
