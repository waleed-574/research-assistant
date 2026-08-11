import { RuntimeContext } from "@mastra/core/runtime-context";
import { type UserLocation } from "./schemas";

/**
 * Dynamic context injection.
 *
 * The location is NOT baked into the agents' system prompts. Instead we put it
 * on a per-request Mastra RuntimeContext, and the agents read it at call time
 * via a function-based `instructions`. That means one agent definition serves
 * every user, and the same agent behaves differently for a user in Germany vs.
 * the US — the location flows in as request state, not configuration.
 *
 * Flow:
 *   1. /api/geolocate detects a UserLocation from the request IP.
 *   2. The client keeps it (and lets the user override it).
 *   3. Every agent call ships the location in its request body; the route
 *      rebuilds a RuntimeContext with buildRuntimeContext() and passes it to
 *      agent.generate({ runtimeContext }).
 *   4. The agent's dynamic instructions call locationPromptBlock() to inject it.
 */

export const LOCATION_KEY = "userLocation" as const;

export type AppRuntimeContext = {
  [LOCATION_KEY]: UserLocation;
};

export function buildRuntimeContext(
  location: UserLocation,
): RuntimeContext<AppRuntimeContext> {
  const rc = new RuntimeContext<AppRuntimeContext>();
  rc.set(LOCATION_KEY, location);
  return rc;
}

export function getLocation(
  runtimeContext?: RuntimeContext<AppRuntimeContext>,
): UserLocation | undefined {
  return runtimeContext?.get(LOCATION_KEY);
}

/**
 * The exact text injected into an agent's system prompt describing the user's
 * location and how to use it. Shared by both agents so behaviour is consistent.
 */
export function locationPromptBlock(location?: UserLocation): string {
  if (!location || location.source === "fallback") {
    return [
      "USER LOCATION: unknown (geolocation unavailable).",
      "Do not assume a region. If regional specifics matter (regulations,",
      "currency, local providers), ask the user which country to target, or",
      "clearly caveat that guidance is generic.",
    ].join(" ");
  }

  const place = [location.city, location.region, location.country]
    .filter(Boolean)
    .join(", ");
  const langs = location.languages?.length
    ? location.languages.join(", ")
    : "unknown";

  const lines = [
    `USER LOCATION (${location.source === "user-override" ? "confirmed by user" : "detected via IP"}):`,
    `- Place: ${place || location.country}`,
    `- Country code: ${location.countryCode}`,
    location.currency ? `- Local currency: ${location.currency}` : null,
    location.timezone ? `- Timezone: ${location.timezone}` : null,
    location.isEU ? `- EU member state: yes (consider GDPR, SEPA, and EU-wide regulations)` : null,
    `- Preferred languages: ${langs}`,
    "",
    "USE THIS CONTEXT WITHOUT being asked:",
    "- Tailor findings to this region: applicable regulations, local/regional",
    "  providers, market conditions, and pricing in the local currency.",
    "- Match terminology and units the user expects (e.g. VAT vs sales tax).",
    "- If the user's request is inherently global, note the regional angle but",
    "  don't force it.",
  ].filter(Boolean);

  return lines.join("\n");
}
