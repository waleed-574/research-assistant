/**
 * Compact ISO-3166 alpha-2 → ISO-4217 currency lookup.
 *
 * Some free geo providers (e.g. ipwho.is) no longer return currency, but the
 * assignment's whole point is regional personalization — pricing in the local
 * currency matters. This covers the major economies and the full euro area;
 * unknown countries fall back to null and the agent adapts.
 */
export const COUNTRY_CURRENCY: Record<string, string> = {
  // Euro area
  AT: "EUR", BE: "EUR", HR: "EUR", CY: "EUR", EE: "EUR", FI: "EUR",
  FR: "EUR", DE: "EUR", GR: "EUR", IE: "EUR", IT: "EUR", LV: "EUR",
  LT: "EUR", LU: "EUR", MT: "EUR", NL: "EUR", PT: "EUR", SK: "EUR",
  SI: "EUR", ES: "EUR",
  // Rest of Europe
  GB: "GBP", CH: "CHF", NO: "NOK", SE: "SEK", DK: "DKK", PL: "PLN",
  CZ: "CZK", HU: "HUF", RO: "RON", BG: "BGN", UA: "UAH", TR: "TRY",
  RU: "RUB",
  // Americas
  US: "USD", CA: "CAD", MX: "MXN", BR: "BRL", AR: "ARS", CL: "CLP",
  CO: "COP", PE: "PEN",
  // Asia-Pacific
  PK: "PKR", IN: "INR", CN: "CNY", JP: "JPY", KR: "KRW", ID: "IDR",
  MY: "MYR", SG: "SGD", TH: "THB", PH: "PHP", VN: "VND", BD: "BDT",
  AU: "AUD", NZ: "NZD", HK: "HKD", TW: "TWD",
  // Middle East & Africa
  AE: "AED", SA: "SAR", QA: "QAR", IL: "ILS", EG: "EGP", ZA: "ZAR",
  NG: "NGN", KE: "KES",
};

export function currencyForCountry(code?: string | null): string | null {
  if (!code) return null;
  return COUNTRY_CURRENCY[code.toUpperCase()] ?? null;
}

/**
 * EU member states. The geo providers report EU membership themselves, but when
 * the user overrides their location by hand we have to derive it — `isEU` drives
 * the GDPR/SEPA/EU-regulation awareness in the agents' prompts.
 */
export const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
]);

export function isEuCountry(code?: string | null): boolean {
  return code ? EU_COUNTRIES.has(code.toUpperCase()) : false;
}
