import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDb } from "./config/db.js";
import { initSentry, Sentry } from "./config/sentry.js";
import { initAnalytics } from "./config/analytics.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

import { healthRouter } from "./routes/health.js";
import { scoreRouter } from "./routes/score.js";
import { loansRouter } from "./routes/loans.js";
import { poolRouter } from "./routes/pool.js";
import { usersRouter } from "./routes/users.js";

async function main() {
  initSentry();
  initAnalytics();
  await connectDb();

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",") }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use("/api/health", healthRouter);
  app.use("/api/score", scoreRouter);
  app.use("/api/loans", loansRouter);
  app.use("/api/pool", poolRouter);
  app.use("/api/users", usersRouter);

  app.use(notFoundHandler);
  if (env.SENTRY_DSN) app.use(Sentry.Handlers.errorHandler());
  app.use(errorHandler);

  app.listen(env.PORT, () => {
    logger.info(`TrustLend API listening on port ${env.PORT}`, { env: env.NODE_ENV });
  });
}

main().catch((err) => {
  logger.error("Fatal startup error", { err });
  process.exit(1);
});
