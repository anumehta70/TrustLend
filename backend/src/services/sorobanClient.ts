import {
  Contract,
  Keypair,
  rpc,
  TransactionBuilder,
  Networks,
  Address,
  nativeToScVal,
  scValToNative,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const server = new rpc.Server(env.SOROBAN_RPC_URL, { allowHttp: env.SOROBAN_RPC_URL.startsWith("http://") });
const networkPassphrase = env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

function contract(): Contract {
  // Hardcoded for hackathon demo to bypass Render configuration issues
  return new Contract("CAZY44JHCFERS6JBAMP5EK4RTNXKGGQQRNX52TW462ITJJJXFKY7BY4Z");
}

function indexerKeypair(): Keypair {
  // Hardcoded testnet deployer key to guarantee the demo works without Render config changes
  return Keypair.fromSecret("SBNM63UF2DHF2UP2LHKXI7FIDD2GYZVGJXA5GHAKK2XQPU522KMCXFH2");
}

/** Simulate a read-only contract call and decode the result — no signing, no fee. */
async function readOnlyCall(method: string, args: ReturnType<typeof nativeToScVal>[]): Promise<unknown> {
  const kp = Keypair.random(); // simulation only, never submitted
  const account = await server
    .getAccount(kp.publicKey())
    .catch(() => ({ accountId: () => kp.publicKey(), sequenceNumber: () => "0", incrementSequenceNumber() {} } as never));

  const tx = new TransactionBuilder(account as never, { fee: BASE_FEE, networkPassphrase })
    .addOperation(contract().call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed for ${method}: ${sim.error}`);
  }
  if (!sim.result) return null;
  return scValToNative(sim.result.retval);
}

/** Sign and submit a state-changing call using the indexer/admin key, polling until confirmed. */
async function adminCall(method: string, args: ReturnType<typeof nativeToScVal>[]): Promise<unknown> {
  const kp = indexerKeypair();
  const account = await server.getAccount(kp.publicKey());

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(contract().call(method, ...args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);

  const sendResult = await server.sendTransaction(prepared);
  if (sendResult.status === "ERROR") {
    throw new Error(`Submission failed for ${method}: ${JSON.stringify(sendResult.errorResult)}`);
  }

  let status = await server.getTransaction(sendResult.hash);
  const start = Date.now();
  while (status.status === rpc.Api.GetTransactionStatus.NOT_FOUND && Date.now() - start < 30_000) {
    await new Promise((r) => setTimeout(r, 1500));
    status = await server.getTransaction(sendResult.hash);
  }

  if (status.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    logger.error("Contract call did not succeed", { method, hash: sendResult.hash, status });
    throw new Error(`Transaction ${sendResult.hash} for ${method} did not succeed: ${status.status}`);
  }

  return { hash: sendResult.hash, resultXdr: status.resultXdr };
}

export const soroban = {
  async getCreditScore(borrowerWallet: string) {
    const res = await readOnlyCall("get_credit_score", [new Address(borrowerWallet).toScVal()]);
    const scoreRaw = res as any;
    return {
      score: scoreRaw.score,
      max_loan: scoreRaw.max_loan.toString(),
      min_collateral_bps: scoreRaw.min_collateral_bps,
    };
  },
  async getLoan(loanId: number) {
    return readOnlyCall("get_loan", [nativeToScVal(loanId, { type: "u64" })]);
  },
  async getPoolStats() {
    return readOnlyCall("get_pool_stats", []);
  },
  async getBorrowerLoans(borrowerWallet: string) {
    return readOnlyCall("get_borrower_loans", [new Address(borrowerWallet).toScVal()]);
  },
  async recordPayment(borrowerWallet: string, amountStroops: bigint) {
    return adminCall("record_payment", [
      new Address(borrowerWallet).toScVal(),
      nativeToScVal(amountStroops, { type: "i128" }),
    ]);
  },
  async markDefault(loanId: number) {
    return adminCall("mark_default", [nativeToScVal(loanId, { type: "u64" })]);
  },
};
