import { FormGraphSchema, ResearchReportSchema, type FormGraph, type ResearchEvent, type ResearchReport } from "../schemas";
import formGraphJson from "./form-graph.json";
import researchRunJson from "./research-run.json";

/**
 * Captured agent responses, replayed when `USE_AGENT_FIXTURES=1`.
 *
 * These are real outputs recorded from live runs — the form graph came from
 * `/api/form-builder`, and the research run (31 progress events + a 35-source
 * report) from an `/api/research` SSE stream — so the UI sees exactly the shapes
 * it would in production, including the awkward ones like markdown inside
 * section prose.
 *
 * Both are parsed through the same Zod schemas the routes use, at import time.
 * A fixture that drifts out of shape therefore fails loudly and immediately
 * rather than producing a subtly wrong UI.
 */

export const fixtureForm: FormGraph = FormGraphSchema.parse(formGraphJson);

const researchRun = researchRunJson as {
  events: ResearchEvent[];
  report: unknown;
  usedMock?: boolean;
  steps?: number;
};

export const fixtureReport: ResearchReport = ResearchReportSchema.parse(
  researchRun.report,
);

export const fixtureResearchEvents: ResearchEvent[] = researchRun.events;

export const fixtureResearchSteps = researchRun.steps ?? 0;

/** The interview reply used before the fixture form is proposed. */
export const FIXTURE_INTERVIEW_QUESTION =
  "(fixture mode) Got it. One thing before I build the form: will you be training models locally, or mostly using remote/cloud compute?";

/** The reply that accompanies the fixture form. */
export const FIXTURE_FORM_REPLY =
  "(fixture mode) Here's your research form — replayed from a captured response, so no API call was made.";

/**
 * How many messages the user must have sent before the fixture form appears.
 * Mirrors the real agent, which asks a question or two before proposing a form,
 * so the state machine is exercised the same way.
 */
export const FIXTURE_TURNS_BEFORE_FORM = 2;
