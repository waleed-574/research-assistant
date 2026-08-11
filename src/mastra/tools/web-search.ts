import { createTool } from "@mastra/core/tools";
import { tavily } from "@tavily/core";
import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * Web search tool for the Research Agent's agentic loop.
 *
 * Backed by Tavily (built for LLM agents: returns clean, rankable results with
 * source URLs). If TAVILY_API_KEY is absent, it degrades to deterministic mock
 * results so the whole app — loop, retries, progress UI, source attribution —
 * still runs end-to-end without any external key.
 *
 * Reliability: transient failures are retried with backoff, and a hard failure
 * returns an empty result set with `error` set rather than throwing, so one bad
 * query never aborts the agent's loop (it can reflect and try another query).
 */

export const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  content: z.string().describe("relevant snippet / summary"),
  score: z.number().describe("Tavily relevance score, 0-1"),
});

export const WebSearchInputSchema = z.object({
  query: z.string().describe("a focused, self-contained search query"),
  topic: z
    .enum(["general", "news", "finance"])
    .default("general")
    .describe("search vertical; use 'news' for recent events, 'finance' for markets"),
  maxResults: z.number().int().min(1).max(10).default(5),
});

export const WebSearchOutputSchema = z.object({
  query: z.string(),
  answer: z.string().optional().describe("Tavily's short synthesized answer, if any"),
  results: z.array(SearchResultSchema),
  usedMock: z.boolean().describe("true when no API key was configured"),
  error: z.string().optional(),
});

export type WebSearchOutput = z.infer<typeof WebSearchOutputSchema>;

const MAX_ATTEMPTS = 3;

function mockResults(query: string): WebSearchOutput {
  logger.warn("web-search", `TAVILY_API_KEY missing — returning mock results for "${query}"`);
  return {
    query,
    answer: `(Mock) No live search configured. This is placeholder evidence for "${query}". Add TAVILY_API_KEY to .env.local for real sources.`,
    results: [
      {
        title: `Mock result: overview of "${query}"`,
        url: "https://example.com/mock/overview",
        content: `Placeholder summary for "${query}". Set TAVILY_API_KEY to fetch real, citable sources.`,
        score: 0.5,
      },
      {
        title: `Mock result: considerations for "${query}"`,
        url: "https://example.com/mock/considerations",
        content: `Second placeholder covering trade-offs relevant to "${query}".`,
        score: 0.4,
      },
    ],
    usedMock: true,
  };
}

async function runTavily(
  apiKey: string,
  input: z.infer<typeof WebSearchInputSchema>,
): Promise<WebSearchOutput> {
  const client = tavily({ apiKey });
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await client.search(input.query, {
        topic: input.topic,
        maxResults: input.maxResults,
        searchDepth: "basic",
        includeAnswer: true,
      });
      return {
        query: input.query,
        answer: res.answer,
        results: (res.results ?? []).map((r) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
        })),
        usedMock: false,
      };
    } catch (err) {
      lastError = err;
      logger.warn(
        "web-search",
        `attempt ${attempt}/${MAX_ATTEMPTS} failed for "${input.query}"`,
        String(err),
      );
      // Exponential backoff: 300ms, 900ms. No sleep after the final attempt.
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 300 * 3 ** (attempt - 1)));
      }
    }
  }

  // Soft-fail: hand the loop an empty result so it can reflect and re-query.
  return {
    query: input.query,
    results: [],
    usedMock: false,
    error: `Search failed after ${MAX_ATTEMPTS} attempts: ${String(lastError)}`,
  };
}

export const webSearchTool = createTool({
  id: "web_search",
  description:
    "Search the web for current, citable information. Returns ranked results with titles, URLs, and snippets. Call repeatedly with focused queries to gather evidence before answering.",
  inputSchema: WebSearchInputSchema,
  outputSchema: WebSearchOutputSchema,
  execute: async ({ context }) => {
    const apiKey = process.env.TAVILY_API_KEY?.trim();
    if (!apiKey) return mockResults(context.query);
    logger.info("web-search", `searching: "${context.query}" (${context.topic})`);
    return runTavily(apiKey, context);
  },
});
