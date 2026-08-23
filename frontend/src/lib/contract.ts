import {
  Contract,
  rpc,
  TransactionBuilder,
  BASE_FEE,
  Address,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID ?? "";
const TOKEN_CONTRACT_ID = import.meta.env.VITE_TOKEN_CONTRACT_ID ?? "";

const server = new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith("http://") });

function requireContractId(): string {
  if (!CONTRACT_ID) throw new Error("VITE_CONTRACT_ID is not configured — see frontend/.env.example");
  return CONTRACT_ID;
}

export type SignFn = (xdr: string, networkPassphrase: string) => Promise<string>;

/**
 * Builds a contract invocation signed by the connected wallet, submits
 * it, and polls for confirmation. Returns the transaction hash so it
 * can be surfaced to the user (and recorded by the backend as proof of
 * a real wallet interaction).
 */
export async function invokeAsWallet(
  method: string,
  args: ReturnType<typeof nativeToScVal>[],
  sourcePublicKey: string,
  sign: SignFn
): Promise<{ hash: string; result: unknown }> {
  const account = await server.getAccount(sourcePublicKey);
  const contract = new Contract(requireContractId());

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  const signedXdr = await sign(prepared.toXDR(), NETWORK_PASSPHRASE);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction rejected: ${JSON.stringify(sendResult.errorResult)}`);
  }

  let status = await server.getTransaction(sendResult.hash);
  const start = Date.now();
  while (status.status === rpc.Api.GetTransactionStatus.NOT_FOUND && Date.now() - start < 30_000) {
    await new Promise((r) => setTimeout(r, 1500));
    status = await server.getTransaction(sendResult.hash);
  }

  if (status.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Transaction ${sendResult.hash} did not succeed: ${status.status}`);
  }

  const result = status.returnValue ? scValToNative(status.returnValue) : null;
  return { hash: sendResult.hash, result };
}

export const contractArgs = {
  address: (addr: string) => new Address(addr).toScVal(),
  i128: (value: bigint | number) => nativeToScVal(value, { type: "i128" }),
  u64: (value: bigint | number) => nativeToScVal(value, { type: "u64" }),
};

export const tokenContractId = TOKEN_CONTRACT_ID;
