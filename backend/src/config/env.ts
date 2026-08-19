import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/trustlend"),
  SOROBAN_RPC_URL: z.string().default("https://soroban-testnet.stellar.org"),
  STELLAR_NETWORK_PASSPHRASE: z.string().default("Test SDF Network ; September 2015"),
  HORIZON_URL: z.string().default("https://horizon-testnet.stellar.org"),
  CONTRACT_ID: z.string().default(""),
  TOKEN_CONTRACT_ID: z.string().default(""),
  INDEXER_SECRET: z.string().default(""),
  SENTRY_DSN: z.string().default(""),
  POSTHOG_API_KEY: z.string().default(""),
  POSTHOG_HOST: z.string().default("https://app.posthog.com"),
  CORS_ORIGIN: z.string().default("*"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed — check backend/.env against .env.example");
}

export const env = parsed.data;
