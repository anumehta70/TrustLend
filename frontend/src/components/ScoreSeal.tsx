import "./ScoreSeal.css";

interface ScoreSealProps {
  score: number; // 300-1000
  min?: number;
  max?: number;
}

export function ScoreSeal({ score, min = 300, max = 1000 }: ScoreSealProps) {
  const pct = Math.min(1, Math.max(0, (score - min) / (max - min)));
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - pct);

  const tier = score >= 850 ? "Prime" : score >= 700 ? "Sound" : score >= 550 ? "Building" : "New";

  return (
    <div className="score-seal">
      <svg viewBox="0 0 128 128" width="128" height="128">
        <circle cx="64" cy="64" r="54" fill="none" stroke="var(--rule-strong)" strokeWidth="6" />
        <circle
          cx="64"
          cy="64"
          r="54"
          fill="none"
          stroke="var(--brass-400)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
        />
        <text x="64" y="60" textAnchor="middle" className="score-seal-num" fontFamily="Fraunces, serif">
          {score}
        </text>
        <text x="64" y="78" textAnchor="middle" className="score-seal-tier" fontFamily="'IBM Plex Mono', monospace">
          {tier.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
