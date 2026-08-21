import { Router } from "express";
import { z } from "zod";
import { soroban } from "../services/sorobanClient.js";
import { syncWalletPayments } from "../services/creditIndexer.js";
import { ApiError } from "../middleware/errorHandler.js";
import { track } from "../config/analytics.js";
import { User } from "../models/User.js";

export const scoreRouter = Router();

const walletParam = z.object({ wallet: z.string().min(5) });

scoreRouter.get("/:wallet", async (req, res, next) => {
  try {
    const { wallet } = walletParam.parse(req.params);
    const score = await soroban.getCreditScore(wallet);
    res.json({ wallet, score });
  } catch (err) {
    next(err instanceof Error && err.message.includes("NoPaymentHistory") ? new ApiError(404, "No payment history recorded for this wallet yet") : err);
  }
});

/** Triggers a fresh Horizon -> contract sync for one wallet's payment history. */
scoreRouter.post("/:wallet/sync", async (req, res, next) => {
  try {
    const { wallet } = walletParam.parse(req.params);
    const result = await syncWalletPayments(wallet);

    await User.findOneAndUpdate(
      { wallet },
      { $setOnInsert: { role: "borrower", firstConnectedAt: new Date() }, $set: { lastSeenAt: new Date() } },
      { upsert: true }
    );
    track(wallet, "payment_history_synced", result);

    res.json({ wallet, ...result });
  } catch (err) {
    next(err);
  }
});
