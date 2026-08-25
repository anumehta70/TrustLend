import { useState } from "react";
import { api } from "../lib/api";

export function FeedbackForm({ wallet }: { wallet: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (rating === 0) {
      setError("Pick a rating first");
      return;
    }
    try {
      await api.submitFeedback(wallet, rating, comment);
      setSent(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback");
    }
  }

  if (sent) {
    return (
      <div className="ledger-card">
        <p className="card-label">Feedback</p>
        <p className="lede">Logged — thank you. It helps size the next entry in the ledger.</p>
      </div>
    );
  }

  return (
    <div className="ledger-card">
      <p className="card-label">Quick feedback</p>
      <p className="lede" style={{ marginBottom: "12px" }}>
        How did this session feel?
      </p>
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            className="btn btn-ghost"
            style={{ padding: "8px 14px", borderColor: n <= rating ? "var(--brass-400)" : undefined, color: n <= rating ? "var(--brass-300)" : undefined }}
            onClick={() => setRating(n)}
            aria-pressed={n <= rating}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="comment">Comment (optional)</label>
        <textarea id="comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      {error && <p className="hint" style={{ color: "var(--copper-300)" }}>{error}</p>}
      <button className="btn btn-brass" onClick={submit}>
        Send feedback
      </button>
    </div>
  );
}
