const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request to ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface CreditScore {
  score: number;
  max_loan: string;
  min_collateral_bps: number;
}

export interface LoanRecord {
  loanId: number;
  borrower: string;
  principal: string;
  collateral: string;
  status: "active" | "repaid" | "defaulted";
  requestTxHash: string;
  dueAt: string;
  createdAt: string;
}

export const api = {
  connectWallet: (wallet: string, role: "borrower" | "lender") =>
    request("/users/connect", { method: "POST", body: JSON.stringify({ wallet, role }) }),

  submitFeedback: (wallet: string, rating: number, comment: string) =>
    request("/users/feedback", { method: "POST", body: JSON.stringify({ wallet, rating, comment }) }),

  getScore: (wallet: string) => request<{ wallet: string; score: CreditScore }>(`/score/${wallet}`),

  syncPayments: (wallet: string) =>
    request<{ wallet: string; synced: number; skipped: number }>(`/score/${wallet}/sync`, { method: "POST" }),

  recordLoan: (payload: {
    loanId: number;
    borrower: string;
    principal: string;
    collateral: string;
    requestTxHash: string;
    dueAt: string;
  }) => request<LoanRecord>("/loans", { method: "POST", body: JSON.stringify(payload) }),

  getBorrowerLoans: (wallet: string) => request<LoanRecord[]>(`/loans/borrower/${wallet}`),

  getPoolStats: () => request<{ stats: [string, string] }>("/pool/stats"),
};
