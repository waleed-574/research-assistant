"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FALLBACK_LOCATION,
  type FormAnswers,
  type FormGraph,
  type ResearchEvent,
  type UserLocation,
} from "@/mastra/schemas";
import {
  fetchLocation,
  runResearchStream,
  sendInterviewTurn,
  type ChatMessage,
  type ResearchResult,
} from "@/lib/client-api";
import {
  initialAnswers,
  mergeAnswers,
  pruneHiddenAnswers,
  validateAnswers,
  visibleFields,
} from "@/lib/form-logic";
import { ChatInterview } from "./chat-interview";
import { FormRenderer } from "./form-renderer";
import { LocationBar } from "./location-bar";
import { ReportView } from "./report-view";
import { ResearchProgress } from "./research-progress";

/**
 * The state machine for the whole flow:
 *
 *   INTERVIEW ──(agent calls submit_form_draft)──► FORM ──(submit)──► RESEARCHING ──► REPORT
 *       ▲                                          │
 *       └──────────── edit requests ───────────────┘
 *
 * All agent behaviour lives server-side in src/mastra; this component only moves
 * data between the two routes and the views.
 */

type Stage = "interview" | "form" | "researching" | "report";

const STAGES: { id: Stage; label: string; heading: string }[] = [
  { id: "interview", label: "Interview", heading: "What do you want to research?" },
  { id: "form", label: "Your form", heading: "Review your form" },
  { id: "researching", label: "Research", heading: "Researching your question" },
  { id: "report", label: "Report", heading: "Your research report" },
];

export function ResearchApp() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [stage, setStage] = useState<Stage>("interview");
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);

  const [form, setForm] = useState<FormGraph | null>(null);
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showValidation, setShowValidation] = useState(false);

  const [events, setEvents] = useState<ResearchEvent[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Detect location once on load. A failure here is not fatal — the agents have
  // an explicit "location unknown" prompt path.
  useEffect(() => {
    let cancelled = false;
    fetchLocation()
      .then((detected) => {
        if (!cancelled) setLocation(detected);
      })
      .catch(() => {
        if (!cancelled) setLocation(FALLBACK_LOCATION);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Abandon an in-flight research run if the component goes away.
  useEffect(() => () => abortRef.current?.abort(), []);

  const sendTurn = useCallback(
    async (text: string) => {
      if (!location) return;
      const next: ChatMessage[] = [...messages, { role: "user", content: text }];
      setMessages(next);
      setChatBusy(true);
      setError(null);

      try {
        const reply = await sendInterviewTurn(next, location);
        setMessages([...next, { role: "assistant", content: reply.reply }]);

        if (reply.form) {
          const revised = reply.form;
          // On an edit the agent resends the whole form, so carry over what the
          // user already filled in rather than resetting the fields.
          setAnswers((current) =>
            form
              ? mergeAnswers(revised, current, form.fields)
              : initialAnswers(revised),
          );
          setForm(revised);
          setFieldErrors({});
          setShowValidation(false);
          setStage("form");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setChatBusy(false);
      }
    },
    [form, location, messages],
  );

  const updateAnswer = useCallback(
    (fieldId: string, value: FormAnswers[string]) => {
      setAnswers((previous) => {
        const next = { ...previous, [fieldId]: value };
        // Re-validate live once the user has attempted a submit, so errors clear
        // as they're fixed instead of lingering.
        if (showValidation && form) setFieldErrors(validateAnswers(form, next));
        return next;
      });
    },
    [form, showValidation],
  );

  const startResearch = useCallback(async () => {
    if (!form || !location) return;

    const problems = validateAnswers(form, answers);
    setFieldErrors(problems);
    setShowValidation(true);
    if (Object.keys(problems).length > 0) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setStage("researching");
    setEvents([]);
    setResult(null);
    setError(null);

    try {
      const research = await runResearchStream(
        { form, answers: pruneHiddenAnswers(form, answers), location },
        (event) => setEvents((previous) => [...previous, event]),
        controller.signal,
      );
      setResult(research);
      setStage("report");
    } catch (err) {
      if (controller.signal.aborted) {
        setStage("form");
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setStage("form");
    } finally {
      abortRef.current = null;
    }
  }, [answers, form, location]);

  const reset = () => {
    abortRef.current?.abort();
    setStage("interview");
    setMessages([]);
    setForm(null);
    setAnswers({});
    setFieldErrors({});
    setShowValidation(false);
    setEvents([]);
    setResult(null);
    setError(null);
  };

  const visibleCount = useMemo(
    () => (form ? visibleFields(form, answers).length : 0),
    [answers, form],
  );

  const activeIndex = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Step {activeIndex + 1} of {STAGES.length}
            </span>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {STAGES[activeIndex]?.heading}
            </h1>
          </div>
          {stage !== "interview" && (
            <button
              type="button"
              onClick={reset}
              className="text-xs font-medium text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Start over
            </button>
          )}
        </div>
        <Stepper current={stage} />
        <LocationBar
          location={location}
          disabled={stage === "researching"}
          onChange={setLocation}
        />
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {/* ── Interview ─────────────────────────────────────────────────── */}
      {(stage === "interview" || stage === "form") && (
        <section className="flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Start here
              </span>
              <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                Tell me what you want to research and I&apos;ll ask a couple of
                questions, then build you a form. Answering it kicks off a
                web-research run that returns a cited report.
              </p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                For example: &ldquo;I need to choose a payroll provider for my
                12-person startup.&rdquo;
              </p>
            </div>
          )}

          {stage === "form" && messages.length > 0 ? (
            <details className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Interview &amp; edits ({messages.length} messages)
              </summary>
              <p className="mt-2 mb-4 text-xs text-zinc-500 dark:text-zinc-400">
                Ask for changes — &ldquo;add a field for team size&rdquo;,
                &ldquo;make budget optional&rdquo; — and the form updates.
              </p>
              <ChatInterview
                messages={messages}
                busy={chatBusy}
                placeholder="Ask for a change to the form…"
                onSend={sendTurn}
              />
            </details>
          ) : (
            <ChatInterview
              messages={messages}
              busy={chatBusy}
              placeholder={
                location
                  ? "What would you like to research?"
                  : "Detecting location…"
              }
              onSend={sendTurn}
            />
          )}
        </section>
      )}

      {/* ── Form ──────────────────────────────────────────────────────── */}
      {stage === "form" && form && (
        <section className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-900/5 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Generated form
            </span>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {form.title}
            </h2>
            {form.description && (
              <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {form.description}
              </p>
            )}
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
              {visibleCount} of {form.fields.length} fields shown — the rest
              appear based on your answers.
            </p>
          </div>

          <FormRenderer
            form={form}
            answers={answers}
            errors={showValidation ? fieldErrors : {}}
            onChange={updateAnswer}
          />

          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <button
              type="button"
              onClick={startResearch}
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Run research
            </button>
            {showValidation && Object.keys(fieldErrors).length > 0 && (
              <span className="text-xs text-red-600 dark:text-red-400">
                Fix {Object.keys(fieldErrors).length} field
                {Object.keys(fieldErrors).length === 1 ? "" : "s"} above.
              </span>
            )}
          </div>
        </section>
      )}

      {/* ── Researching ───────────────────────────────────────────────── */}
      {stage === "researching" && (
        <section className="flex flex-col gap-4">
          <ResearchProgress events={events} running />
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="self-start text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Cancel
          </button>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            The agent chains its own searches, so this usually takes a couple of
            minutes.
          </p>
        </section>
      )}

      {/* ── Report ────────────────────────────────────────────────────── */}
      {stage === "report" && result && (
        <section className="flex flex-col gap-8">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-900/5 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
            <ReportView
              report={result.report}
              usedMock={result.usedMock}
              steps={result.steps}
            />
          </div>
          <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setStage("form")}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
            >
              Change answers
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
            >
              New research
            </button>
          </div>
          <details className="text-xs text-zinc-500 dark:text-zinc-400">
            <summary className="cursor-pointer">Research log</summary>
            <div className="mt-3">
              <ResearchProgress events={events} running={false} />
            </div>
          </details>
        </section>
      )}
    </div>
  );
}

function Stepper({ current }: { current: Stage }) {
  const activeIndex = STAGES.findIndex((s) => s.id === current);

  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {STAGES.map((step, i) => {
        const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
        return (
          <li key={step.id} className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={`grid h-6 w-6 place-items-center rounded-md border font-mono text-xs transition-colors ${
                  state === "done"
                    ? "border-emerald-500 bg-emerald-500 text-white dark:text-zinc-950"
                    : state === "active"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-600"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span
                className={`hidden text-xs sm:inline ${
                  state === "active"
                    ? "font-medium text-zinc-900 dark:text-zinc-100"
                    : state === "done"
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "text-zinc-400 dark:text-zinc-600"
                }`}
              >
                {step.label}
              </span>
            </span>
            {i < STAGES.length - 1 && (
              <span
                aria-hidden
                className={`h-px w-4 sm:w-6 ${
                  i < activeIndex
                    ? "bg-emerald-500/50"
                    : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
