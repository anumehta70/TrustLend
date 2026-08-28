import { Horizon } from "@stellar/stellar-sdk";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { PaymentEvent } from "../models/PaymentEvent.js";
import { soroban } from "./sorobanClient.js";

const horizon = new Horizon.Server(env.HORIZON_URL, { allowHttp: env.HORIZON_URL.startsWith("http://") });

/**
 * Pulls recent payment operations for `wallet` from Horizon, stores any
 * we haven't seen yet, and forwards them to the contract's payment
 * ledger so the borrower's credit score reflects real settled income.
 *
 * In production this runs on a schedule (or via Horizon streaming) for
 * every wallet a user has connected — here it's exposed as an
 * on-demand sync so the demo doesn't require a background worker.
 */
export async function syncWalletPayments(wallet: string): Promise<{ synced: number; skipped: number }> {
  let synced = 0;
  let skipped = 0;

  const page = await horizon
    .operations()
    .forAccount(wallet)
    .order("desc")
    .limit(50)
    .call();

  for (const op of page.records) {
    if (op.type !== "payment" && op.type !== "path_payment_strict_receive" && op.type !== "path_payment_strict_send" && op.type !== "create_account") {
      continue;
    }
    const record = op as unknown as {
      to?: string;
      account?: string;
      amount?: string;
      starting_balance?: string;
      asset_type?: string;
      transaction_hash: string;
      created_at: string;
    };
    
    const recipient = record.to || record.account;
    if (recipient !== wallet) continue; // only inbound payments count as income signal

    const exists = await PaymentEvent.findOne({ txHash: record.transaction_hash });
    if (exists) {
      skipped += 1;
      continue;
    }

    const amountDecimal = Number(record.amount || record.starting_balance || "0");
    if (!(amountDecimal > 0)) continue;
    const amountStroops = BigInt(Math.round(amountDecimal * 10_000_000));

    const doc = await PaymentEvent.create({
      wallet,
      amount: amountStroops.toString(),
      assetCode: record.asset_type === "native" ? "XLM" : "USDC",
      txHash: record.transaction_hash,
      ledgerCloseTime: new Date(record.created_at),
      recordedOnChain: false,
    });

    try {
      await soroban.recordPayment(wallet, amountStroops);
      doc.recordedOnChain = true;
      await doc.save();
      synced += 1;
    } catch (err) {
      logger.error("Failed to record payment on-chain", { wallet, txHash: record.transaction_hash, err });
    }
  }

  return { synced, skipped };
}
