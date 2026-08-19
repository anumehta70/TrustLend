import { Schema, model } from "mongoose";

export interface PaymentEventDoc {
  wallet: string;
  amount: string; // stroops, stored as string to avoid float precision loss
  assetCode: string;
  txHash: string;
  ledgerCloseTime: Date;
  recordedOnChain: boolean;
  createdAt: Date;
}

const paymentEventSchema = new Schema<PaymentEventDoc>({
  wallet: { type: String, required: true, index: true },
  amount: { type: String, required: true },
  assetCode: { type: String, required: true, default: "USDC" },
  txHash: { type: String, required: true, unique: true },
  ledgerCloseTime: { type: Date, required: true },
  recordedOnChain: { type: Boolean, default: false },
  createdAt: { type: Date, default: () => new Date() },
});

export const PaymentEvent = model<PaymentEventDoc>("PaymentEvent", paymentEventSchema);
