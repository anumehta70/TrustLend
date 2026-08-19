import { Schema, model } from "mongoose";

export type LoanStatus = "active" | "repaid" | "defaulted";

export interface LoanDoc {
  loanId: number;
  borrower: string;
  principal: string;
  collateral: string;
  status: LoanStatus;
  requestTxHash: string;
  dueAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const loanSchema = new Schema<LoanDoc>(
  {
    loanId: { type: Number, required: true, unique: true },
    borrower: { type: String, required: true, index: true },
    principal: { type: String, required: true },
    collateral: { type: String, required: true },
    status: { type: String, enum: ["active", "repaid", "defaulted"], default: "active" },
    requestTxHash: { type: String, required: true },
    dueAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Loan = model<LoanDoc>("Loan", loanSchema);
