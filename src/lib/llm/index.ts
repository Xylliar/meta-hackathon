import "server-only";
import { mockProvider } from "./mock";
import { museApiKey, museProvider } from "./muse";
import type { LlmProvider } from "./types";

/** Muse when a key is configured, otherwise the offline mock so the app still demos. */
export function getProvider(): LlmProvider {
  return museApiKey() ? museProvider : mockProvider;
}
