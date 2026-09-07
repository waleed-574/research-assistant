"use client";

import type { ReactNode } from "react";
import type { ResearchReport } from "@/mastra/schemas";
import { Prose } from "./prose";

/**
 * The finished report. Citations are rendered as links to the numbered sources
 * the agent actually retrieved, so a claim can always be traced back.
 */

export function ReportView({
  report,
  usedMock,
  steps,
}: {
  report: ResearchReport;
  usedMock: boolean;
  steps: number;
}) {
  const sourcesById = new Map(report.sources.map((s) => [s.id, s]));

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
          {report.title.trim()}
        </h1>
        <p className="text-[15px] leading-7 text-zinc-600 dark:text-zinc-300">
          {report.summary.trim()}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {report.sources.length} sources · {steps} research steps
        </p>
        {usedMock && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            Mock search results were used for at least one query — add
            <code className="mx-1 font-mono">TAVILY_API_KEY</code>
            to .env.local for live sources.
          </p>
        )}
      </header>

      {report.keyFindings.length > 0 && (
        <Section title="Key findings">
          <ul className="flex flex-col gap-2">
            {report.keyFindings.map((finding, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-[15px] leading-7 text-zinc-700 dark:text-zinc-300"
              >
                <span aria-hidden className="text-zinc-400 dark:text-zinc-500">
                  —
                </span>
                <Prose text={finding} className="flex flex-col gap-2" />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {report.sections.map((section, i) => (
        <Section key={i} title={section.heading}>
          <Prose text={section.content} />
          {section.citations.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-zinc-400 dark:text-zinc-500">
                Sources
              </span>
              {section.citations.map((id) => {
                const source = sourcesById.get(id);
                return source ? (
                  <a
                    key={id}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={source.title}
                    className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    [{id}]
                  </a>
                ) : (
                  // Shouldn't happen — but never present a citation that
                  // doesn't resolve as though it were verified.
                  <span
                    key={id}
                    title="This citation has no matching source"
                    className="rounded border border-dashed border-amber-400 px-1.5 py-0.5 font-mono text-[11px] text-amber-700 dark:text-amber-400"
                  >
                    [{id}?]
                  </span>
                );
              })}
            </p>
          )}
        </Section>
      ))}

      {report.regionalNotes && (
        <Section title="Regional notes">
          <Prose text={report.regionalNotes} />
        </Section>
      )}

      <Section title={`Sources (${report.sources.length})`}>
        <ol className="flex flex-col gap-3">
          {report.sources.map((source) => (
            <li key={source.id} className="flex gap-3 text-sm">
              <span className="shrink-0 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                [{source.id}]
              </span>
              <div className="min-w-0">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:text-zinc-100 dark:decoration-zinc-600 dark:hover:decoration-zinc-100"
                >
                  {source.title}
                </a>
                <p className="truncate text-xs text-zinc-400 dark:text-zinc-500">
                  {source.url}
                </p>
                {source.snippet && (
                  <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                    {source.snippet}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title.trim()}
      </h2>
      {children}
    </section>
  );
}
