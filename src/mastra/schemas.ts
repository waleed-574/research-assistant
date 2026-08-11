import { z } from "zod";

/**
 * Central schema module. Everything typed that crosses the agent/UI boundary
 * is defined here once as a Zod schema, then the TypeScript type is inferred
 * from it. This gives us:
 *   - typed tool inputs/outputs (a Mastra requirement),
 *   - structured-output validation for agents,
 *   - a single source of truth shared by server and client.
 *
 * This file imports ONLY zod, so it is safe to import from client components.
 */

/* ─────────────────────────── Location ─────────────────────────── */

export const LocationSourceSchema = z.enum([
  "ip", // detected from the request IP
  "user-override", // the user corrected it in the UI
  "fallback", // detection failed; neutral default
]);

export const LocationSchema = z.object({
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  country: z.string().describe("Full country name, e.g. 'Germany'"),
  countryCode: z
    .string()
    .describe("ISO 3166-1 alpha-2 code, e.g. 'DE'")
    .default("XX"),
  timezone: z.string().nullable().optional(),
  currency: z
    .string()
    .nullable()
    .optional()
    .describe("ISO 4217 code, e.g. 'EUR'"),
  isEU: z
    .boolean()
    .default(false)
    .describe("whether the country is in the EU (drives GDPR/SEPA/EU-reg awareness)"),
  languages: z
    .array(z.string())
    .default([])
    .describe("BCP-47 language codes, most-preferred first, e.g. ['de','en']"),
  source: LocationSourceSchema.default("ip"),
});

export type UserLocation = z.infer<typeof LocationSchema>;

/** Neutral default used when geolocation fails or is unavailable. */
export const FALLBACK_LOCATION: UserLocation = {
  city: null,
  region: null,
  country: "Unknown",
  countryCode: "XX",
  timezone: null,
  currency: null,
  isEU: false,
  languages: ["en"],
  source: "fallback",
};

/* ───────────────────── Conditional form graph ───────────────────── */

export const FieldTypeSchema = z.enum([
  "text",
  "textarea",
  "email",
  "number",
  "select",
  "radio",
  "multiselect",
  "boolean",
  "date",
]);
export type FieldType = z.infer<typeof FieldTypeSchema>;

/**
 * A single edge condition. "Show field X when field Y <operator> value".
 * These conditions are the directed edges of the form graph; the nodes are
 * the fields themselves.
 */
export const ConditionSchema = z.object({
  fieldId: z.string().describe("id of the field this condition reads"),
  operator: z.enum([
    "equals",
    "not_equals",
    "includes", // for multiselect answers containing a value
    "greater_than",
    "less_than",
    "exists", // any non-empty answer
  ]),
  value: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .describe("comparison value; omit for the 'exists' operator"),
});
export type Condition = z.infer<typeof ConditionSchema>;

export const DependencySchema = z.object({
  logic: z
    .enum(["all", "any"])
    .default("all")
    .describe("whether ALL or ANY of the conditions must hold"),
  conditions: z.array(ConditionSchema).min(1),
});
export type Dependency = z.infer<typeof DependencySchema>;

export const OptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const ValidationSchema = z.object({
  min: z.number().optional().describe("min value (number) "),
  max: z.number().optional().describe("max value (number)"),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional().describe("regex source string"),
});

export const FormFieldSchema = z.object({
  id: z
    .string()
    .describe("stable snake_case identifier, unique within the form"),
  label: z.string(),
  type: FieldTypeSchema,
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean().default(false),
  options: z
    .array(OptionSchema)
    .optional()
    .describe("REQUIRED for select / radio / multiselect fields"),
  validation: ValidationSchema.optional(),
  dependsOn: DependencySchema.optional().describe(
    "Incoming edge(s): the field is only shown/traversed when satisfied. " +
      "Omit for always-visible root fields.",
  ),
});
export type FormField = z.infer<typeof FormFieldSchema>;

export const FormGraphSchema = z.object({
  title: z.string().describe("short form title"),
  description: z.string().optional(),
  fields: z
    .array(FormFieldSchema)
    .min(1)
    .describe("nodes of the form graph, in natural display order"),
});
export type FormGraph = z.infer<typeof FormGraphSchema>;

/** A filled-out form: fieldId -> answer. */
export type FormAnswers = Record<
  string,
  string | number | boolean | string[] | null
>;

/* ───────────────────────── Research report ───────────────────────── */

export const SourceSchema = z.object({
  id: z.number().describe("1-based citation id referenced by sections"),
  title: z.string(),
  url: z.string(),
  snippet: z.string().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const ReportSectionSchema = z.object({
  heading: z.string(),
  content: z.string().describe("markdown-friendly prose"),
  citations: z
    .array(z.number())
    .default([])
    .describe("ids of sources supporting this section"),
});

export const ResearchReportSchema = z.object({
  title: z.string(),
  summary: z.string().describe("2-4 sentence executive summary"),
  keyFindings: z.array(z.string()).describe("3-6 crisp bullet takeaways"),
  sections: z.array(ReportSectionSchema),
  regionalNotes: z
    .string()
    .optional()
    .describe(
      "How the user's location shaped these findings (regulations, providers, currency, language).",
    ),
  sources: z.array(SourceSchema),
});
export type ResearchReport = z.infer<typeof ResearchReportSchema>;

/* ─────────────────── Research progress (SSE) events ─────────────────── */

/**
 * Progress events streamed from /api/research. Declared here rather than in
 * run-research.ts so client components can import the type without pulling the
 * server-only agent module into the browser bundle.
 */
export type ResearchEventType =
  | "planning"
  | "search"
  | "search-result"
  | "synthesizing"
  | "done"
  | "error";

export interface ResearchEvent {
  type: ResearchEventType;
  message: string;
  data?: unknown;
}
