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
import { logger } from "@/lib/logger";
import { ChatInterview } from "./chat-interview";
import { FormRenderer } from "./form-renderer";
import { LocationBar } from "./location-bar";
import { ReportView } from "./report-view";
import { ResearchProgress } from "./research-progress";

/**
 * The state machine for the whole flow. The five states mirror the brief's
 * diagram exactly:
 *
 *   INTERVIEWING ──▶ FORM_PREVIEW ──▶ FORM_ACTIVE ──▶ RESEARCHING ──▶ PRESENTING
 *        ▲               │  ▲              │                              │
 *        │      (edits)  ▼  └──(back)──────┘                              │
 *        └───────────────┘        └──────────(change answers)◀───────────┘
 *
 * Transitions (every one is logged, per the brief's "log state changes"):
 *   INTERVIEWING → FORM_PREVIEW   agent proposes a form (submit_form_draft)
 *   FORM_PREVIEW → FORM_PREVIEW   user asks for edits; agent re-proposes
 *   FORM_PREVIEW → FORM_ACTIVE    user confirms and starts filling it out
 *   FORM_ACTIVE  → FORM_PREVIEW   user steps back to review        (backward)
 *   FORM_ACTIVE  → RESEARCHING    user submits a valid form
 *   RESEARCHING  → PRESENTING     research completes
 *   RESEARCHING  → FORM_ACTIVE    user cancels, or an error        (backward)
 *   PRESENTING   → FORM_ACTIVE    user revisits their answers      (backward)
 *   any          → INTERVIEWING   start over
 *
 * All agent behaviour lives server-side in src/mastra; this component only moves
 * data between the two routes and the views.
 */

type Stage =
  | "interviewing"
  | "form_preview"
  | "form_active"
  | "researching"
  | "presenting";

const STAGES: { id: Stage; label: string; heading: string }[] = [
  { id: "interviewing", label: "Interview", heading: "What do you want to research?" },
  { id: "form_preview", label: "Preview", heading: "Review your form" },
  { id: "form_active", label: "Fill out", heading: "Fill out your form" },
  { id: "researching", label: "Research", heading: "Researching your question" },
  { id: "presenting", label: "Report", heading: "Your research report" },
];

export function ResearchApp() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [stage, setStage] = useState<Stage>("interviewing");
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

  // Log every state transition — an explicit requirement, and the clearest
  // window onto the state machine. Ref rather than logging inline so all paths
  // (including reset) are captured in one place.
  const prevStage = useRef<Stage>(stage);
  useEffect(() => {
    if (prevStage.current !== stage) {
      logger.info("state-machine", `${prevStage.current} → ${stage}`);
      prevStage.current = stage;
    }
  }, [stage]);

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
          // Any freshly proposed form lands in PREVIEW for the user to confirm,
          // even an edit made while filling it out.
          setStage("form_preview");
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
      setStage("presenting");
    } catch (err) {
      if (controller.signal.aborted) {
        setStage("form_active");
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setStage("form_active");
    } finally {
      abortRef.current = null;
    }
  }, [answers, form, location]);

  const reset = () => {
    abortRef.current?.abort();
    setStage("interviewing");
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
  const conditionalCount = useMemo(
    () => (form ? form.fields.filter((f) => f.dependsOn).length : 0),
    [form],
  );

  const activeIndex = STAGES.findIndex((s) => s.id === stage);
  const onForm = stage === "form_preview" || stage === "form_active";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Step {activeIndex + 1} of {STAGES.length}
            </span>
            <h1 className="mt-1.5 font-serif text-3xl font-medium tracking-tight text-zinc-50">
              {STAGES[activeIndex]?.heading}
            </h1>
          </div>
          {stage !== "interviewing" && (
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

      {/* ── Interview chat ────────────────────────────────────────────── */}
      {(stage === "interviewing" || onForm) && (
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

          {onForm && messages.length > 0 ? (
            // While reviewing or filling, the interview folds into an editor:
            // open during PREVIEW (edits are expected), collapsed during ACTIVE.
            <details
              open={stage === "form_preview"}
              className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/40"
            >
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

      {/* ── Form: PREVIEW (read-only, confirm) & ACTIVE (fill, submit) ─── */}
      {onForm && form && (
        <section className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-900/5 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              {stage === "form_preview" ? "Preview · read-only" : "Filling out"}
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
              {stage === "form_preview"
                ? `${form.fields.length} field${form.fields.length === 1 ? "" : "s"}${
                    conditionalCount
                      ? `, ${conditionalCount} shown conditionally as you answer`
                      : ""
                  }.`
                : `${visibleCount} of ${form.fields.length} fields shown — the rest appear based on your answers.`}
            </p>
          </div>

          <FormRenderer
            form={form}
            answers={answers}
            errors={stage === "form_active" && showValidation ? fieldErrors : {}}
            disabled={stage === "form_preview"}
            onChange={updateAnswer}
          />

          {stage === "form_preview" ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setStage("form_active")}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Fill out the form
                <span aria-hidden>→</span>
              </button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                or ask for changes in the interview above.
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
              <button
                type="button"
                onClick={startResearch}
                className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Run research
              </button>
              <button
                type="button"
                onClick={() => setStage("form_preview")}
                className="text-xs font-medium text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                ← Back to review
              </button>
              {showValidation && Object.keys(fieldErrors).length > 0 && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  Fix {Object.keys(fieldErrors).length} field
                  {Object.keys(fieldErrors).length === 1 ? "" : "s"} above.
                </span>
              )}
            </div>
          )}
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

      {/* ── Presenting ────────────────────────────────────────────────── */}
      {stage === "presenting" && result && (
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
              onClick={() => setStage("form_active")}
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
                className={`h-px w-3 sm:w-5 ${
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
