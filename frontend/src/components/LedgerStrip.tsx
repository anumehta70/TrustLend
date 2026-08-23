import "./LedgerStrip.css";

export interface LedgerEntry {
  no: number;
  label: string;
  amount: string;
  direction: "in" | "out";
}

interface LedgerStripProps {
  entries: LedgerEntry[];
}

/**
 * The page's signature element: a running ledger tape, styled after a
 * hand-kept account book, entry numbers included because they carry
 * real meaning here — this is a literal transaction sequence, not
 * decoration.
 */
export function LedgerStrip({ entries }: LedgerStripProps) {
  const loop = [...entries, ...entries];
  return (
    <div className="ledger-strip" aria-hidden="true">
      <div className="ledger-strip-track">
        {loop.map((e, i) => (
          <span className="ledger-entry" key={`${e.no}-${i}`}>
            <span className="no">#{String(e.no).padStart(4, "0")}</span>
            <span>{e.label}</span>
            <span className={`amt ${e.direction === "in" ? "tag-in" : "tag-out"}`}>
              {e.direction === "in" ? "+" : "−"}
              {e.amount}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
