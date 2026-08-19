import { Schema, model } from "mongoose";

export interface UserDoc {
  wallet: string;
  role: "borrower" | "lender";
  firstConnectedAt: Date;
  lastSeenAt: Date;
}

const userSchema = new Schema<UserDoc>({
  wallet: { type: String, required: true, unique: true, index: true },
  role: { type: String, enum: ["borrower", "lender"], required: true },
  firstConnectedAt: { type: Date, default: () => new Date() },
  lastSeenAt: { type: Date, default: () => new Date() },
});

export const User = model<UserDoc>("User", userSchema);

export interface FeedbackDoc {
  wallet: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Date;
}

const feedbackSchema = new Schema<FeedbackDoc>({
  wallet: { type: String, required: true, index: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: "" },
  createdAt: { type: Date, default: () => new Date() },
});

export const Feedback = model<FeedbackDoc>("Feedback", feedbackSchema);
