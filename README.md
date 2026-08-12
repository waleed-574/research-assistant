# Research Assistant

Two cooperating AI agents that turn a vague research goal into a cited report.

The **Form Builder Agent** interviews you in chat, then designs a conditional form — a graph of
fields where follow-up questions appear based on earlier answers. You fill it in. The **Research
Agent** takes your answers, runs its own web-search loop (planning queries, reading results,
chaining follow-up searches), and returns a structured report with citations that link back to the
pages it actually retrieved.

Both agents are location-aware without ever asking where you are: your region is detected from your
IP and injected into each agent's prompt at request time, so prices come back in your currency and
findings reference providers and regulations that apply to you.

Built with [Next.js](https://nextjs.org) (App Router) and [Mastra](https://mastra.ai).

## Pages

The app is two pages, sharing one design system (logo, Geist sans/mono pairing, zinc palette,
emerald accent):

| Route | Page |
| --- | --- |
| `/` | **Marketing landing** — a single-scroll page that introduces the tool (hero, how-it-works, features, the location differentiator, CTA). Fully static. |
| `/app` | **The app** — the interview → form → research → report flow. |

---

## How it works

```
  INTERVIEW ──(agent calls submit_form_draft)──► FORM ──(submit)──► RESEARCHING ──► REPORT
      ▲                                           │
      └──────────────── edit requests ────────────┘
```

1. **Interview** — you describe your goal. The agent asks 2–4 focused questions, one at a time.
2. **Form** — when it knows enough it calls its `submit_form_draft` tool. That tool call *is* the
   signal to advance; the UI renders the returned graph, showing only reachable fields.
3. **Research** — your answers go to the Research Agent, which searches the web in a bounded loop.
   Every query and result count streams to the browser live over Server-Sent Events.
4. **Report** — a validated, structured report: summary, key findings, sections with citations,
   regional notes, and the full source list.

You can go back and ask for form changes at any point ("add a field for team size", "make budget
optional"); the agent resends the whole revised form and your existing answers are carried over.

---

## Quick start

**Prerequisites:** Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # then add your keys (see below)
npm run dev
```

Open <http://localhost:3000> for the landing page, or <http://localhost:3000/app> to go straight to
the app.

### API keys

Put these in `.env.local` (git-ignored). Restart `npm run dev` after editing.

| Variable | Required | What it does |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | **Yes** | Powers both agents. Get one at [console.anthropic.com](https://console.anthropic.com/settings/keys). |
| `TAVILY_API_KEY` | No | Gives the Research Agent real web results with source URLs. Free tier at [app.tavily.com](https://app.tavily.com/). |
| `ANTHROPIC_MODEL` | No | Overrides the model. Defaults to `anthropic/claude-sonnet-4-5`. A bare name like `claude-haiku-4-5` is fine — the `anthropic/` prefix is added for you. |
| `RESEARCH_MAX_STEPS` | No | Caps the research loop. Defaults to `8`, clamped to 1–20. See [Running without spending](#running-without-spending). |
| `USE_AGENT_FIXTURES` | No | Replays captured agent responses — zero API calls, no key needed. Ignored in production builds. |

**Without `ANTHROPIC_API_KEY`** the agent routes return `503` with a clear message rather than
failing obscurely.

**Without `TAVILY_API_KEY`** the app still runs end to end: `web_search` returns deterministic mock
results, and the report is flagged in the UI with a banner so you never mistake placeholder evidence
for real sources.

### Other commands

```bash
npm test            # run the unit tests
npm run test:watch  # re-run on change
npm run build       # production build
npm start           # serve the production build
npm run lint        # eslint
```

### Checking it came up correctly

```bash
curl http://localhost:3000/api/health
# {"status":"ok","mastra":true,"agents":["formBuilder","research"]}
```

That endpoint confirms the server booted *and* that the Mastra instance imports cleanly inside a
route handler with both agents registered.

---

## Running without spending

A live research run is the expensive part of this app: the agent chains 13–14 searches over ~8 steps,
and **every step re-sends the search results gathered so far**, so the late steps cost the most. Two
switches exist so you don't pay that while working on anything else.

### Fixture mode — zero API calls

```bash
USE_AGENT_FIXTURES=1 npm run dev
```

Both agent routes replay responses captured from real runs: an 8-field form graph (one field
conditional) and a 31-event research stream ending in a 35-source report. The SSE events are paced so
the progress UI animates exactly as it does live — **a full run takes ~3 seconds instead of ~3.7
minutes**, and no key is required at all.

The whole UI can be built, demoed, and reviewed in this mode. The fixtures live in
`src/mastra/fixtures/` and are parsed through the same Zod schemas the routes use, so one that drifts
out of shape fails loudly at import rather than producing a subtly wrong UI.

It refuses to engage when `NODE_ENV=production`, regardless of the flag — serving a canned report as
though it were freshly researched would mislead the user, and it's exactly the setting that gets left
on by accident.

### Cheaper live runs

When you do need the real agents:

```bash
RESEARCH_MAX_STEPS=3 npm run dev            # biggest lever — skips the expensive late steps
ANTHROPIC_MODEL=anthropic/claude-haiku-4-5  # for checking plumbing, not research quality
```

Leaving `TAVILY_API_KEY` blank also cuts **Anthropic** tokens, not just Tavily usage: mock results are
two short entries instead of six long ones, so the context that gets re-sent each step stays small.

---

## Tests

```bash
npm test   # 59 tests, ~350ms
```

[Vitest](https://vitest.dev), node environment, no jsdom. Four suites covering the pure logic — the
places where a bug is invisible from the outside:

| Suite | What it pins down |
| --- | --- |
| `src/lib/form-logic.test.ts` | Graph traversal: transitive hiding (a grandchild hides when its parent hides, despite a stale answer), loose equality (`value: true` vs `"true"`), numeric vs lexical comparison, `all`/`any` logic, cyclic-graph safety, hidden-answer pruning, and validation including required-but-hidden fields |
| `src/lib/client-api.test.ts` | The SSE reader at the byte level: a frame split across reads mid-JSON, several frames in one read, a trailing frame with no blank line, garbled frames, and error propagation |
| `src/mastra/tool-chunks.test.ts` | The `payload` nesting, against chunks captured verbatim from `@mastra/core` 0.24.9 |
| `src/components/prose.test.tsx` | Markdown rendering and — more importantly — its false positives: `5 * 3 * 2` and `snake_case` must stay literal. Rendered via `react-dom/server`, so no DOM is needed |

Two of these exist because they caught real bugs: email format was skipped for fields with no
`validation` block, and `5 * 3 * 2` rendered as `5 <em>3</em> 2`.

**What the tests deliberately don't cover:** agent behaviour. Whether the model actually calls
`web_search`, or produces a good report, can only be observed against the live API — the
`structuredOutput` trap described below is invisible to a unit test. That behaviour was verified by
driving the app end to end in a browser and reading the server log. Component interaction isn't
covered either; that would need jsdom, and the browser run is better evidence per unit of effort.

---

## Architecture

The guiding rule: **all agent logic lives in `src/mastra`, and the UI never touches it.** The API
routes are thin adapters that validate I/O and inject request context. The browser only ever speaks
JSON to those routes.

| Path | Role |
| --- | --- |
| `src/mastra/agents/` | The two agent definitions (instructions, model, tools) |
| `src/mastra/tools/` | `web_search` (Tavily), `submit_form_draft`, `geolocate` |
| `src/mastra/research/run-research.ts` | Orchestrates the research loop and emits progress events |
| `src/mastra/schemas.ts` | Every cross-boundary type, as Zod schemas. Imports only `zod`, so it is safe to import from client components |
| `src/mastra/context.ts` | Per-request `RuntimeContext` carrying the user's location |
| `src/mastra/model.ts` | The single place that decides which LLM is used |
| `src/app/api/` | Route handlers: `form-builder`, `research` (SSE), `geolocate`, `health` |
| `src/components/` | The UI: state machine, chat, form renderer, progress, report |
| `src/lib/form-logic.ts` | Conditional-graph traversal and validation — pure, no React |
| `src/lib/client-api.ts` | The browser's only view of the server, including the SSE reader |

`src/mastra/schemas.ts` is the contract. Types are inferred from Zod schemas, which simultaneously
give typed tool inputs/outputs, structured-output validation for the agents, and one source of truth
shared by server and client.

---

## Design decisions

### Location is request state, not configuration

The location is **not** baked into either system prompt. It is attached to a per-request Mastra
`RuntimeContext`, and both agents declare `instructions` as a *function* of that context. One agent
definition therefore serves every user, and the same agent behaves differently for someone in Berlin
versus Karachi. The user can also correct the detected location in the UI, which flips the source to
`user-override` and changes how the prompt frames it ("confirmed by user" vs "detected via IP").

### The form is a graph, and a tool call is the state transition

`submit_form_draft` has no side effects — it validates and echoes the form back. It exists as a tool
rather than plain structured output for two reasons: the interview is multi-turn, so the *agent*
decides when it is ready, and a tool call is an unambiguous "I'm proposing a form now" signal the
state machine can watch for. Zod validation on the tool input also guarantees the UI only ever
receives a well-formed graph.

Fields are nodes; `dependsOn` conditions are directed edges. Visibility is evaluated in
`src/lib/form-logic.ts`, and it is **transitive** — a field is hidden when the field its condition
reads is itself hidden, so a stale answer left behind by a now-hidden parent can't keep a grandchild
on screen. Hidden answers are stripped before submission: the Research Agent never sees a value the
user can't see.

### Research is two explicit phases

This is the least obvious decision in the codebase, and it is load-bearing.

Mastra picks its structured-output strategy like this:

```js
structuredOutputMode = schema ? (structuredOutput.model ? "processor" : "direct") : undefined
```

In `"direct"` mode the schema becomes the model's **native JSON `response_format`**, which forces it
to emit the object on its first turn — so it can never reach a tool. Attaching the report schema to
the search call therefore produces a confident, well-formatted report containing **zero real
searches and entirely invented source URLs**. Passing a `model` switches to `"processor"` mode and
restores tool use, but then the agent can spend its whole step budget searching and never synthesize,
yielding no report at all.

So the loop is split:

1. **Search** — `generate()` with no schema attached. The agent plans, searches, and reflects, bounded
   by `maxSteps`. Each step's prose is captured, so findings survive even if the budget runs out
   mid-loop.
2. **Synthesis** — a separate, tool-free call that receives the gathered evidence *plus the numbered
   list of sources actually retrieved* and returns the schema-validated report.

Handing the model the real source list in phase 2 is what makes citation ids resolve to genuine URLs
instead of plausible-looking ones. The UI marks any citation that doesn't resolve rather than
rendering it as though it were verified.

### Reading Mastra's tool chunks

`toolResults` and `toolCalls` are stream *chunks*, with the interesting fields nested under
`payload`:

```js
{ type: 'tool-result', runId, from: 'AGENT',
  payload: { toolCallId, toolName, args, result } }
```

Reading `chunk.toolName` directly yields `undefined` and fails silently — the tool really ran, but its
output is dropped. `src/mastra/tool-chunks.ts` keeps that shape knowledge in one place and tolerates a
flat chunk too, so a future Mastra version that un-nests the payload won't break callers.

### Degrade, don't crash

- **Search failures** are retried with backoff, then return an empty result set with `error` set
  rather than throwing — one bad query can't abort the loop, and the agent can reflect and re-query.
- **Geolocation** tries two providers in turn (`ipwho.is`, then `ipapi.co`, which blocks some
  datacenter IPs) and falls back to a neutral "location unknown" that has its own explicit prompt
  path telling the agent not to assume a region.
- **No Tavily key** falls back to mock results, surfaced honestly in the UI.

### Observability

`src/lib/logger.ts` is a dependency-free structured logger. Every state change is scoped and
timestamped, so a run is legible in the terminal:

```
▸ [geolocate] resolved Pakistan (PK) via ipwho.is
▸ [form-builder] proposed form "Project Management Tool for Design Agency" with 10 fields
▸ [research] search-result: Found 8 sources.
▸ [research] done: Research complete — 52 source(s), 8 step(s).
```

The same events stream to the browser during research, so the loop is visible rather than looking
hung — and seeing the actual queries is what distinguishes real retrieval from a model answering
from memory.

---

## What a real run looks like

Measured against the live APIs, from a session in Lahore, Pakistan:

- Interview turn: **4–20s** per reply
- Form: 10 fields, 2 of them conditional
- Research: **~3.7 minutes**, 8 steps, 13 searches, **52 sources**, no dangling citations
- The report priced options in USD *and* PKR, cited Pakistan-specific payment-gateway sources, and
  noted that PayPal is unavailable in the region — none of which was asked for

---

## Known limitations

- **A research run takes 2–4 minutes.** That is inherent to a chained-search loop; the live progress
  stream exists to make the wait legible, and the run can be cancelled.
- **Tests cover the pure logic, not the agents.** 59 unit tests guard the form graph, the SSE reader,
  the tool-chunk parsing and the markdown renderer, but nothing automated verifies that the agents
  behave — that needs live API calls. See [Tests](#tests).
- **No persistence.** State lives in React memory; a refresh starts over.
- **Citation quality depends on the model.** Phase 2 is given the real source list and instructed to
  cite only from it, and unresolvable citations are visually flagged, but nothing forces the mapping
  to be semantically correct.
- **Location detection is IP-based**, so VPN users need the manual override.
