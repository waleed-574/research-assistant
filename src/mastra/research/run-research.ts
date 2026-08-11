import { researchAgent } from "../agents/research";
import { buildRuntimeContext } from "../context";
import { hasAnthropicKey } from "../model";
import { readToolCall, readToolResult } from "../tool-chunks";
import { logger } from "@/lib/logger";
import {
  ResearchReportSchema,
  type ResearchReport,
  type ResearchEvent,
  type Source,
  type FormGraph,
  type FormAnswers,
  type UserLocation,
} from "../schemas";

// Re-exported for existing importers; the canonical declaration is in schemas.ts
// so client components can use it too.
export type { ResearchEvent, ResearchEventType } from "../schemas";

/**
 * Orchestrates the Research Agent's agentic loop and makes it observable.
 *
 * Runs in two phases:
 *   1. SEARCH — Mastra/the model drives the loop (plan -> web_search ->
 *      reflect -> repeat), bounded by maxSteps.
 *   2. SYNTHESIS — a separate, tool-free call turns the gathered evidence into
 *      ResearchReportSchema.
 *
 * The split is load-bearing, not cosmetic: a schema attached to the phase-1
 * call becomes the model's native JSON response_format, which makes it answer
 * immediately and never search. Keeping synthesis separate also guarantees a
 * report even if phase 1 uses its whole step budget searching, and lets us
 * hand the model the real retrieved sources so citations resolve.
 *
 * Along the way we stream progress via onStepFinish so the UI can show what's
 * happening, and capture the sources actually retrieved for attribution.
 */

export interface RunResearchArgs {
  form: FormGraph;
  answers: FormAnswers;
  location: UserLocation;
  /** Called as the loop progresses; wire this to SSE for live UI updates. */
  onEvent?: (event: ResearchEvent) => void;
  /** Hard cap on agent steps (tool calls + reasoning turns). */
  maxSteps?: number;
}

export interface RunResearchResult {
  report: ResearchReport;
  steps: number;
  usedMock: boolean;
}

/** Render the completed form into readable prompt text (skips empty answers). */
function formatSubmission(form: FormGraph, answers: FormAnswers): string {
  const lines = form.fields
    .map((f) => {
      const a = answers[f.id];
      if (a === undefined || a === null || a === "" ||
        (Array.isArray(a) && a.length === 0)) {
        return null;
      }
      const value = Array.isArray(a) ? a.join(", ") : String(a);
      return `- ${f.label} (${f.id}): ${value}`;
    })
    .filter(Boolean);

  return [
    `Research form: "${form.title}"`,
    form.description ? `Purpose: ${form.description}` : null,
    "",
    "User's answers:",
    ...lines,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function runResearch(
  args: RunResearchArgs,
): Promise<RunResearchResult> {
  const { form, answers, location, onEvent, maxSteps = 8 } = args;

  if (!hasAnthropicKey()) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to run research.",
    );
  }

  const runtimeContext = buildRuntimeContext(location);
  const emit = (e: ResearchEvent) => {
    logger.info("research", `${e.type}: ${e.message}`);
    onEvent?.(e);
  };

  emit({ type: "planning", message: "Planning the research approach…" });

  const collectedSources: Source[] = [];
  const seenUrls = new Set<string>();
  let usedMock = false;
  let stepCount = 0;

  const prompt = `${formatSubmission(form, answers)}\n\nResearch this thoroughly following your method. Gather your evidence with web_search, then summarise what you found and cite the URLs you actually retrieved.`;

  // ── Phase 1: the agentic search loop ──────────────────────────────────────
  // Deliberately NO structuredOutput here. Attaching a schema to this call
  // makes Mastra apply it as the model's native JSON response_format, which
  // forces a report on the very first turn — web_search never runs and every
  // "source" is invented. Structuring happens in phase 2 instead.
  const stepTexts: string[] = [];

  const research = await researchAgent.generate(prompt, {
    runtimeContext,
    maxSteps,
    // Fires after every reasoning/tool step: our window into the loop.
    onStepFinish: (step: unknown) => {
      stepCount += 1;
      // Defensive reads — the step shape is driven by the AI SDK loop.
      const s = step as {
        toolCalls?: unknown[];
        toolResults?: unknown[];
        text?: string;
      };

      // Keep each step's prose. If the loop is cut off by maxSteps mid-search,
      // `research.text` is empty but these reflections are the findings.
      if (s.text?.trim()) stepTexts.push(s.text.trim());

      for (const chunk of s.toolCalls ?? []) {
        const call = readToolCall<{ query?: string }>(chunk);
        if (call?.toolName === "web_search" && call.args?.query) {
          emit({ type: "search", message: `Searching: “${call.args.query}”` });
        }
      }

      for (const chunk of s.toolResults ?? []) {
        const tr = readToolResult<{
          results?: Array<{ title: string; url: string; content?: string }>;
          usedMock?: boolean;
          error?: string;
        }>(chunk);
        if (tr?.toolName !== "web_search" || !tr.result) continue;
        if (tr.result.usedMock) usedMock = true;
        const hits = tr.result.results ?? [];
        for (const r of hits) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            collectedSources.push({
              id: collectedSources.length + 1,
              title: r.title,
              url: r.url,
              snippet: r.content?.slice(0, 240),
            });
          }
        }
        emit({
          type: "search-result",
          message: tr.result.error
            ? `A search failed — the agent will adapt.`
            : `Found ${hits.length} source${hits.length === 1 ? "" : "s"}.`,
          data: { count: hits.length },
        });
      }
    },
  });

  emit({ type: "synthesizing", message: "Synthesizing findings and citations…" });

  // ── Phase 2: turn the gathered evidence into the structured report ────────
  // A separate, tool-free call. Splitting it out means a report is always
  // produced — even when phase 1 spent its whole step budget searching — and
  // handing the model the numbered list of sources we actually retrieved keeps
  // citation ids pointing at real URLs instead of invented ones.
  const findings = [research.text?.trim(), ...stepTexts]
    .filter(Boolean)
    .join("\n\n");

  const sourceList = collectedSources.length
    ? collectedSources
        .map((s) => `[${s.id}] ${s.title} — ${s.url}\n    ${s.snippet ?? ""}`)
        .join("\n")
    : "(no sources were retrieved)";

  const synthesisPrompt = `${formatSubmission(form, answers)}

## Evidence gathered during research
${findings || "(the search loop ended before writing up its findings — rely on the source snippets below)"}

## Sources actually retrieved (cite by these ids ONLY)
${sourceList}

Write the final report now. Do not search again. Every citation must be an id from the list above, and reproduce those sources (id, title, url) in the report's \`sources\`. If the evidence is thin, say so in the summary rather than filling the gap with unsourced claims.`;

  const structured = await researchAgent.generate(synthesisPrompt, {
    runtimeContext,
    structuredOutput: { schema: ResearchReportSchema },
  });

  const parsed = ResearchReportSchema.safeParse(structured.object);
  if (!parsed.success) {
    throw new Error(
      `The research agent did not return a structured report (finish reason: ${
        structured.finishReason ?? "unknown"
      }, ${stepCount} research step(s)): ${parsed.error.message}`,
    );
  }
  const report = parsed.data;

  // Attribution safety net: if the model didn't echo sources, fall back to the
  // ones we actually retrieved during the loop.
  if (!report.sources || report.sources.length === 0) {
    report.sources = collectedSources;
  }

  emit({
    type: "done",
    message: `Research complete — ${report.sources.length} source(s), ${stepCount} step(s).`,
  });

  return { report, steps: stepCount, usedMock };
}
