import { Router } from "express";
import { z } from "zod";
import { soroban } from "../services/sorobanClient.js";
import { Loan } from "../models/Loan.js";
import { track } from "../config/analytics.js";
import { ApiError } from "../middleware/errorHandler.js";

export const loansRouter = Router();

const recordSchema = z.object({
  loanId: z.number().int().positive(),
  borrower: z.string().min(5),
  principal: z.string(),
  collateral: z.string(),
  requestTxHash: z.string().min(5),
  dueAt: z.string(),
});

/**
 * The frontend calls the contract's `request_loan` directly with the
 * borrower's own Freighter-signed transaction (the backend never holds
 * borrower keys). Once that transaction confirms, the frontend posts
 * the resulting loan id + tx hash here so it's indexed for dashboards
 * and so we have off-chain proof of the wallet interaction for
 * onboarding verification.
 */
loansRouter.post("/", async (req, res, next) => {
  try {
    const body = recordSchema.parse(req.body);
    const loan = await Loan.findOneAndUpdate(
      { loanId: body.loanId },
      {
        loanId: body.loanId,
        borrower: body.borrower,
        principal: body.principal,
        collateral: body.collateral,
        requestTxHash: body.requestTxHash,
        dueAt: new Date(body.dueAt),
        status: "active",
      },
      { upsert: true, new: true }
    );
    track(body.borrower, "loan_originated", { loanId: body.loanId, principal: body.principal });
    res.status(201).json(loan);
  } catch (err) {
    next(err);
  }
});

loansRouter.get("/borrower/:wallet", async (req, res, next) => {
  try {
    const wallet = z.string().min(5).parse(req.params.wallet);
    const loans = await Loan.find({ borrower: wallet }).sort({ createdAt: -1 });
    res.json(loans);
  } catch (err) {
    next(err);
  }
});

loansRouter.get("/:loanId", async (req, res, next) => {
  try {
    const loanId = z.coerce.number().int().positive().parse(req.params.loanId);
    const onChain = await soroban.getLoan(loanId);
    if (!onChain) throw new ApiError(404, "Loan not found on-chain");
    res.json(onChain);
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({ status: z.enum(["active", "repaid", "defaulted"]) });

loansRouter.patch("/:loanId/status", async (req, res, next) => {
  try {
    const loanId = z.coerce.number().int().positive().parse(req.params.loanId);
    const { status } = statusSchema.parse(req.body);
    const loan = await Loan.findOneAndUpdate({ loanId }, { status }, { new: true });
    if (!loan) throw new ApiError(404, "Loan not tracked in the indexer yet");
    res.json(loan);
  } catch (err) {
    next(err);
  }
});

/** Admin/keeper endpoint: settles a past-due loan on-chain (collateral seizure + score penalty). */
loansRouter.post("/:loanId/default", async (req, res, next) => {
  try {
    const loanId = z.coerce.number().int().positive().parse(req.params.loanId);
    const result = await soroban.markDefault(loanId);
    await Loan.findOneAndUpdate({ loanId }, { status: "defaulted" });
    res.json({ loanId, ...(result as object) });
  } catch (err) {
    next(err);
  }
});
