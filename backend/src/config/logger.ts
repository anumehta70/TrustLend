import winston from "winston";
import { env } from "./env.js";

export const logger = winston.createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === "production" ? winston.format.json() : winston.format.simple()
  ),
  defaultMeta: { service: "trustlend-backend" },
  transports: [new winston.transports.Console()],
});
