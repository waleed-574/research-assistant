import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { LocationSchema, FALLBACK_LOCATION, type UserLocation } from "../schemas";
import { currencyForCountry } from "./country-data";
import { logger } from "@/lib/logger";

/**
 * IP geolocation via ipapi.co (no API key required, HTTPS, generous free tier).
 *
 * Two ways this is used:
 *   - as a Mastra tool an agent *could* call, and
 *   - directly by /api/geolocate on session start (the primary path).
 * Both share this one implementation so behaviour can't drift.
 */

const IPAPI_TIMEOUT_MS = 4000;

function isLocalOrPrivate(ip: string): boolean {
  return (
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip === "unknown" ||
    ip.length === 0
  );
}

/**
 * A geolocation provider: how to build its URL and how to map its response to
 * our UserLocation. `map` returns null when the provider signals failure, so
 * the chain can move on to the next one.
 */
interface Provider {
  name: string;
  url: (ip?: string) => string;
  map: (json: Record<string, unknown>) => UserLocation | null;
}

const asString = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

const PROVIDERS: Provider[] = [
  {
    // Reliable, HTTPS, no key, works from most IPs (incl. residential).
    name: "ipwho.is",
    url: (ip) => (ip ? `https://ipwho.is/${ip}` : "https://ipwho.is/"),
    map: (j) => {
      if (j.success === false) return null;
      const tz = j.timezone as { id?: string } | undefined;
      const cur = j.currency as { code?: string } | undefined;
      const country = asString(j.country);
      const code = asString(j.country_code) ?? "XX";
      if (!country) return null;
      return {
        city: asString(j.city),
        region: asString(j.region),
        country,
        countryCode: code,
        timezone: asString(tz?.id),
        // ipwho.is dropped currency from its free tier; derive from country.
        currency: asString(cur?.code) ?? currencyForCountry(code),
        isEU: j.is_eu === true,
        languages: [],
        source: "ip",
      };
    },
  },
  {
    // Secondary. Blocks some datacenter IPs (returns 403), hence the fallback.
    name: "ipapi.co",
    url: (ip) => (ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/"),
    map: (j) => {
      if (j.error) return null;
      const country = asString(j.country_name);
      const code = asString(j.country_code) ?? "XX";
      if (!country) return null;
      const langs = asString(j.languages);
      return {
        city: asString(j.city),
        region: asString(j.region),
        country,
        countryCode: code,
        timezone: asString(j.timezone),
        currency: asString(j.currency) ?? currencyForCountry(code),
        isEU: j.in_eu === true,
        languages: langs ? langs.split(",").map((l) => l.trim()).filter(Boolean) : [],
        source: "ip",
      };
    },
  },
];

/**
 * Resolve a location from an IP, trying each provider in turn. If the IP is
 * local/private (e.g. running on localhost) we omit it so the provider
 * geolocates the caller's public egress IP — a real, demoable location in dev.
 * Returns the neutral fallback only if every provider fails.
 */
export async function geolocateIp(ip?: string): Promise<UserLocation> {
  const lookupIp = ip && !isLocalOrPrivate(ip) ? ip : undefined;

  for (const provider of PROVIDERS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), IPAPI_TIMEOUT_MS);
      const res = await fetch(provider.url(lookupIp), {
        signal: controller.signal,
        headers: { "User-Agent": "research-form-builder/1.0" },
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const location = provider.map(
        (await res.json()) as Record<string, unknown>,
      );
      if (!location) throw new Error("provider reported failure");

      logger.info(
        "geolocate",
        `resolved ${location.country} (${location.countryCode}) via ${provider.name}`,
      );
      return location;
    } catch (err) {
      logger.warn("geolocate", `${provider.name} failed`, String(err));
    }
  }

  logger.warn("geolocate", "all providers failed — using neutral fallback");
  return FALLBACK_LOCATION;
}

export const geolocateTool = createTool({
  id: "geolocate",
  description:
    "Detect the user's approximate location (city, country, currency, languages) from an IP address. Returns a neutral fallback if detection fails.",
  inputSchema: z.object({
    ip: z
      .string()
      .optional()
      .describe("IP address to look up; omit to use the caller's public IP"),
  }),
  outputSchema: LocationSchema,
  execute: async ({ context }) => geolocateIp(context.ip),
});
