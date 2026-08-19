import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

export async function connectDb(): Promise<void> {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("MongoDB connected", { uri: env.MONGODB_URI.replace(/\/\/.*@/, "//***@") });
  } catch (err) {
    logger.error("MongoDB connection failed", { err });
    throw err;
  }

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });
  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB error", { err });
  });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
