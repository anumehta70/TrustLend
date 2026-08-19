import { PostHog } from "posthog-node";
import { env } from "./env.js";
import { logger } from "./logger.js";

let client: PostHog | null = null;

export function initAnalytics(): void {
  if (!env.POSTHOG_API_KEY) {
    logger.warn("POSTHOG_API_KEY not set — analytics events will be logged only, not sent");
    return;
  }
  client = new PostHog(env.POSTHOG_API_KEY, { host: env.POSTHOG_HOST });
}

export function track(distinctId: string, event: string, properties: Record<string, unknown> = {}): void {
  if (client) {
    client.capture({ distinctId, event, properties });
  } else {
    logger.debug("analytics(dry-run)", { distinctId, event, properties });
  }
}

export async function shutdownAnalytics(): Promise<void> {
  if (client) await client.shutdown();
}
