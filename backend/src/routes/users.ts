import { Router } from "express";
import { z } from "zod";
import { User, Feedback } from "../models/User.js";
import { track } from "../config/analytics.js";

export const usersRouter = Router();

const connectSchema = z.object({
  wallet: z.string().min(5),
  role: z.enum(["borrower", "lender"]),
});

usersRouter.post("/connect", async (req, res, next) => {
  try {
    const { wallet, role } = connectSchema.parse(req.body);
    const user = await User.findOneAndUpdate(
      { wallet },
      { $setOnInsert: { role, firstConnectedAt: new Date() }, $set: { lastSeenAt: new Date() } },
      { upsert: true, new: true }
    );
    track(wallet, "wallet_connected", { role });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/", async (_req, res, next) => {
  try {
    const users = await User.find().sort({ firstConnectedAt: -1 });
    res.json({ count: users.length, users });
  } catch (err) {
    next(err);
  }
});

const feedbackSchema = z.object({
  wallet: z.string().min(5),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().default(""),
});

usersRouter.post("/feedback", async (req, res, next) => {
  try {
    const body = feedbackSchema.parse(req.body);
    const feedback = await Feedback.create(body);
    track(body.wallet, "feedback_submitted", { rating: body.rating });
    res.status(201).json(feedback);
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/feedback", async (_req, res, next) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    const avgRating = feedback.length
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : 0;
    res.json({ count: feedback.length, avgRating, feedback });
  } catch (err) {
    next(err);
  }
});
