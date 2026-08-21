import { Router } from "express";
import { soroban } from "../services/sorobanClient.js";

export const poolRouter = Router();

poolRouter.get("/stats", async (_req, res, next) => {
  try {
    const stats = await soroban.getPoolStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});
