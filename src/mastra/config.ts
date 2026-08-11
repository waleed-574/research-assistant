/**
 * Runtime knobs read from the environment, in one place.
 *
 * Both of these exist to control API spend. A research run's cost is dominated
 * by its step count — every step re-sends the search results accumulated so far,
 * so the last steps are by far the most expensive — and during UI work you
 * usually don't need a live agent at all.
 */

export const DEFAULT_RESEARCH_MAX_STEPS = 8;
const MIN_STEPS = 1;
const MAX_STEPS = 20;

/**
 * Hard cap on the research agent's search loop, from `RESEARCH_MAX_STEPS`.
 *
 * Lowering it is the single most effective way to cut cost: at 3 steps a run
 * costs well under half of one at 8, because the expensive late steps never
 * happen. Garbage values fall back to the default rather than throwing — a typo
 * in `.env.local` shouldn't take the route down — and the value is clamped so a
 * stray `RESEARCH_MAX_STEPS=500` can't run up a bill.
 */
export function researchMaxSteps(): number {
  const raw = process.env.RESEARCH_MAX_STEPS?.trim();
  if (!raw) return DEFAULT_RESEARCH_MAX_STEPS;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_RESEARCH_MAX_STEPS;

  return Math.min(MAX_STEPS, Math.max(MIN_STEPS, Math.floor(parsed)));
}

/**
 * Whether to serve captured fixtures instead of calling the agents, from
 * `USE_AGENT_FIXTURES`. Lets the whole UI be developed and demoed with zero API
 * calls.
 *
 * Refuses to engage in a production build regardless of the flag: serving a
 * canned report as though it were freshly researched would be a lie to the user,
 * and it is exactly the kind of setting that gets left on by accident.
 */
// Not named `use…` — that prefix makes ESLint treat it as a React hook.
export function fixturesEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const raw = process.env.USE_AGENT_FIXTURES?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
