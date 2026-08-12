"use client";

import { useEffect, useRef } from "react";
import type { ResearchEvent } from "@/mastra/schemas";

/**
 * Live view of the agent's loop, fed by the SSE events from /api/research.
 * Showing each query as it is issued is what makes the loop legible — and what
 * proves the report came from real retrieval rather than the model's memory.
 */

const ICONS: Record<ResearchEvent["type"], string> = {
  planning: "◇",
  search: "→",
  "search-result": "✓",
  synthesizing: "◆",
  done: "●",
  error: "✕",
};

export function ResearchProgress({
  events,
  running,
}: {
  events: ResearchEvent[];
  running: boolean;
}) {
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [events]);

  const searches = events.filter((e) => e.type === "search").length;
  const sources = events
    .filter((e) => e.type === "search-result")
    .reduce((total, e) => {
      const count = (e.data as { count?: number } | undefined)?.count;
      return total + (typeof count === "number" ? count : 0);
    }, 0);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {running && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          )}
          {running ? "Researching…" : "Research log"}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {searches} {searches === 1 ? "search" : "searches"} · {sources} results
        </p>
      </div>

      <ol className="flex max-h-72 flex-col gap-2 overflow-y-auto text-sm">
        {events.map((event, i) => (
          <li
            key={i}
            ref={i === events.length - 1 ? endRef : undefined}
            className="flex gap-2.5 leading-6"
          >
            <span
              aria-hidden
              className={`mt-px shrink-0 font-mono text-xs ${
                event.type === "error"
                  ? "text-red-500"
                  : event.type === "search-result"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {ICONS[event.type] ?? "·"}
            </span>
            <span
              className={
                event.type === "error"
                  ? "text-red-600 dark:text-red-400"
                  : event.type === "search"
                    ? "text-zinc-800 dark:text-zinc-200"
                    : "text-zinc-500 dark:text-zinc-400"
              }
            >
              {event.message}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
