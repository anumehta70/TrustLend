import type { NextFunction, Request, Response } from "express";
import { Sentry } from "../config/sentry.js";
import { logger } from "../config/logger.js";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const status = err instanceof ApiError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Unexpected error";

  if (status >= 500) {
    logger.error(message, { err });
    Sentry.captureException(err);
  } else {
    logger.warn(message);
  }

  res.status(status).json({ error: message });
}
