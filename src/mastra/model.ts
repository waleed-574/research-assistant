import type { MastraModelConfig } from "@mastra/core";

/**
 * Single place that decides which LLM the agents use.
 *
 * We pass a Mastra "model router" string (e.g. "anthropic/claude-sonnet-4-5")
 * rather than constructing an @ai-sdk/anthropic provider ourselves. Why:
 * Mastra bundles a version-matched Anthropic provider internally and reads
 * ANTHROPIC_API_KEY from the environment. Handing it a string avoids the
 * AI-SDK provider-version mismatch you'd risk by wiring a provider instance
 * from a different major version.
 *
 * Override the model via ANTHROPIC_MODEL in .env.local (must be a value the
 * router knows, e.g. "anthropic/claude-sonnet-4-5" or "anthropic/claude-haiku-4-5").
 */
const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5";

export function resolveModel(): MastraModelConfig {
  const configured = process.env.ANTHROPIC_MODEL?.trim();
  if (!configured) return DEFAULT_MODEL;
  // Allow either "anthropic/xxx" or a bare "xxx" for convenience.
  return configured.includes("/")
    ? configured
    : (`anthropic/${configured}` as MastraModelConfig);
}

/** True when the Anthropic key is present, so routes can fail fast/clearly. */
export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}
