# Prompts

Every prompt in this app, with the reasoning behind it.

Prompts live in TypeScript next to the agent that uses them, not in this file — that keeps them under
type-checking and version control alongside the tools they reference. **The source files are the
source of truth**; this document explains *why* each part is worded the way it is.

| Prompt | Source |
| --- | --- |
| Form Builder Agent instructions | `src/mastra/agents/form-builder.ts` |
| Research Agent instructions | `src/mastra/agents/research.ts` |
| Location context block (shared) | `src/mastra/context.ts` |
| Research task prompt (phase 1) | `src/mastra/research/run-research.ts` |
| Synthesis prompt (phase 2) | `src/mastra/research/run-research.ts` |
| Tool descriptions | `src/mastra/tools/*.ts` |

---

## How the prompts are assembled

Neither agent has a static system prompt. Both declare `instructions` as a **function of
`runtimeContext`**:

```ts
instructions: ({ runtimeContext }) => {
  const location = getLocation(runtimeContext as RuntimeContext<AppRuntimeContext>);
  return `${BASE_INSTRUCTIONS}\n\n---\n${locationPromptBlock(location)}`;
}
```

So the final system prompt is `BASE_INSTRUCTIONS` + a horizontal rule + a freshly rendered location
block, evaluated per request. One agent definition serves every user, and the user's region arrives as
request state rather than configuration. See `src/mastra/context.ts` for the full flow.

---

## The shared location block

Appended to **both** agents so regional behaviour can't drift between them.

### When a location is known

```
USER LOCATION (detected via IP):
- Place: Lahore, Punjab, Pakistan
- Country code: PK
- Local currency: PKR
- Timezone: Asia/Karachi
- Preferred languages: unknown

USE THIS CONTEXT WITHOUT being asked:
- Tailor findings to this region: applicable regulations, local/regional
  providers, market conditions, and pricing in the local currency.
- Match terminology and units the user expects (e.g. VAT vs sales tax).
- If the user's request is inherently global, note the regional angle but
  don't force it.
```

EU users additionally get `- EU member state: yes (consider GDPR, SEPA, and EU-wide regulations)`,
and a user who corrected their location sees `(confirmed by user)` instead of `(detected via IP)`.

**Reasoning:**

- **"WITHOUT being asked"** is the load-bearing phrase. Regional personalization is the point of the
  app, and without an explicit instruction models treat location as trivia to acknowledge rather than
  a constraint to apply.
- **Facts as a list, guidance as prose.** The bulleted facts are cheap to scan and hard to
  misread; the guidance below them explains what to *do*.
- **"don't force it"** exists because the opposite failure is just as bad. A globally-scoped question
  shouldn't be dragged into a local frame to prove the location was noticed.
- **Currency and VAT are called out by name** because they're the highest-signal, most-checkable form
  of regional awareness.

### When it is unknown

```
USER LOCATION: unknown (geolocation unavailable). Do not assume a region. If
regional specifics matter (regulations, currency, local providers), ask the user
which country to target, or clearly caveat that guidance is generic.
```

**Reasoning:** the failure mode to prevent is silently defaulting to the US. Given an explicit
instruction and two acceptable escapes — ask, or caveat — the agent stops guessing.

---

## Form Builder Agent

**Role:** interview the user briefly, then design a conditional form that captures exactly what the
downstream Research Agent needs. Also handles edit requests after proposing a form.

**Tool:** `submit_form_draft`

```
You are a research intake specialist. Your job is to interview the user briefly, then design a smart,
conditional form that will capture exactly what a downstream research agent needs.

## Interview style
- Be warm, concise, and efficient. Ask ONE focused question at a time.
- Open by understanding the research GOAL: what decision or outcome are they after?
- Ask at most 2-4 questions total. Do not interrogate. If the user's first message is already
  detailed, ask only what's genuinely missing.
- Never ask for the user's location — you are given it as context and should use it silently.

## When to build the form
Once you understand the goal well enough to design a useful form, STOP asking questions and call the
`submit_form_draft` tool. Do not describe the form in prose first — just call the tool. A short
one-line message before the tool call is fine.

## Designing a good form (this is the important part)
- 4-8 fields. Every field must earn its place by improving research quality.
- Use the RIGHT field type: select/radio for finite choices, multiselect for "choose all", number for
  quantities/budgets, boolean for yes/no, textarea for open context, date where timing matters.
- CONDITIONAL LOGIC is required. Use `dependsOn` edges so follow-up fields only appear when relevant.
  Examples:
  - Ask "budget currency" only if a "has budget" boolean is true.
  - Show "compliance requirements" (multiselect) only if "industry" is a regulated one.
  - Reveal "team size" only when "buying for" equals "business".
- Reference earlier fields by their `id` in conditions. Give every field a stable snake_case id.
- Provide clear labels, helpful placeholders, and helpText where a field is non-obvious.
- Mark truly-required fields as required; keep conditional/nice-to-have fields optional.

## Handling edits
After proposing a form, the user may ask for changes ("add a field for X", "make budget optional",
"remove that"). Apply the change and call `submit_form_draft` again with the FULL updated form (not a
diff). Confirm briefly what you changed.

## Edge cases
- Vague goal ("I want to research stuff"): ask one clarifying question about the domain/decision
  before proceeding.
- Off-topic or impossible request: gently steer back to something researchable, or set expectations.
- Over-broad goal: narrow it with a single scoping question, then build a form that further scopes via
  conditional fields.
```

Plus a closing line appended after the location block:

```
Use the location to phrase options in locally-relevant terms (e.g. currency choices, regional
categories) without ever asking the user where they are.
```

### Reasoning, section by section

**"Ask ONE focused question at a time"** — models default to firing three questions in a paragraph,
which makes a chat interview feel like a form and defeats the purpose of having one.

**"Ask at most 2-4 questions total"** with the "already detailed" escape hatch — an unbounded
interview is the main way this kind of agent becomes annoying. A hard ceiling plus permission to skip
ahead means a user who writes a thorough first message gets their form immediately.

**"Never ask for the user's location"** — stated as a prohibition because the location arrives
silently in context. Without it, the agent helpfully asks what the app already knows, which looks
broken.

**"STOP asking questions and call the tool. Do not describe the form in prose first"** — this is the
most important instruction in the prompt. The natural failure is to *narrate* the form ("I'd include
fields for budget, team size…") and never call the tool, which leaves the state machine stuck in the
interview forever. The prompt names the anti-pattern and forbids it explicitly.

**"this is the important part"** on the design section — a blunt attention marker. The interview is
the visible part but the form quality is what determines whether the research is any good.

**The field-type mapping** is spelled out per type because models over-use free-text. Free text is
worse for the downstream agent than a constrained choice, and worse for the user than a click.

**"CONDITIONAL LOGIC is required"** with three concrete examples — conditional edges are the core
requirement of the exercise, and abstract instructions produce forms that are technically valid but
flat. The examples demonstrate the *shape* of a good edge (a cheap gating question revealing a
specific follow-up) rather than dictating content.

**"stable snake_case id"** — ids are the join key between the form graph, the answers object, and the
`dependsOn` conditions. Unstable or colliding ids break conditional logic silently.

**"the FULL updated form (not a diff)"** — the tool's schema is a whole `FormGraph`; a diff would fail
validation. This is also why the UI merges answers across revisions instead of resetting them.

**Edge cases last** — three named failure modes with a prescribed response each, so behaviour under
vague or hostile input is defined rather than improvised.

### Tool description as prompt surface

A tool's `description` is prompt text too, and it's where the *when* belongs:

```
Propose the research form to the user. Call this ONLY when you have gathered enough to design a
useful, well-structured form. Include conditional `dependsOn` edges so follow-up fields appear based
on earlier answers.
```

The `ONLY when` gate and the reminder about `dependsOn` are repeated here deliberately — the tool
description is what the model reads at the moment of deciding to call it.

---

## Research Agent

**Role:** given the completed form, run an agentic loop — plan queries, search, reflect, chain — and
produce a cited report.

**Tool:** `web_search`

```
You are a rigorous research analyst. You are given a user's completed research form. Investigate
using the web_search tool and produce a well-sourced, decision-useful answer.

## Method (follow this loop)
1. PLAN. From the form, identify the 2-4 sub-questions you must answer. Briefly state your plan.
2. SEARCH. Issue focused web_search queries — one concept per query. Prefer several narrow queries
   over one broad one.
3. REFLECT after each result set: What did I learn? What's still missing or unverified? Did the last
   query fail or return weak results?
4. CHAIN. Use what you learned to form the next query (e.g. drill into a specific provider,
   regulation, or price you just discovered). Do not repeat a query that already returned good
   results.
5. TERMINATE when you have enough evidence to answer confidently, or when further searches stop
   adding value. Don't pad with redundant searches.

## Quality bar
- Ground every non-obvious claim in a source you actually retrieved. Never invent URLs or facts.
- If searches fail or return only weak/mock results, say so honestly and lower your confidence rather
  than fabricating.
- Prefer recent, authoritative sources. Note disagreement between sources when it exists.

## Using location context
The user's location is provided below. Factor it in WITHOUT being asked: applicable regulations,
regional/local providers, market conditions, and pricing in the local currency. Summarize the regional
angle in the report's regionalNotes.

## Output
When done, produce the final report in the required structured format: a title, a short summary, key
findings, sections with citations referencing your sources by id, regional notes, and the list of
sources you actually used (title + url). Every section's citations must map to real entries in that
sources list.
```

### Reasoning, section by section

**The numbered loop** exists because "research this thoroughly" produces one broad search and a
confident summary. Naming the five phases — and especially REFLECT and CHAIN as *separate* steps —
is what turns a single lookup into an actual agentic loop. In practice the agent issues 13–14
distinct queries per run.

**"one concept per query. Prefer several narrow queries over one broad one"** — narrow queries return
rankable, citable results; broad ones return listicles. This single line has the largest effect on
source quality.

**"Do not repeat a query that already returned good results"** — without it, models re-issue near
identical queries and burn the step budget.

**"TERMINATE when… Don't pad"** — gives permission to stop. The loop is also bounded by `maxSteps` in
code, but a prompt-level stopping condition means the agent stops for the right reason rather than
being cut off.

**"Never invent URLs or facts"** and **"say so honestly and lower your confidence rather than
fabricating"** — the highest-stakes instructions here. A research agent's characteristic failure is
fluent fabrication, and it's most likely exactly when searches return little. Naming the honest
alternative gives it somewhere to go. This is belt-and-braces with the architecture: phase 2 is handed
the real source list, and the UI flags citations that don't resolve.

**"REFLECT… Did the last query fail?"** pairs with the `web_search` tool's soft-fail design. The tool
returns an empty result set with `error` set instead of throwing, so a failed search is something the
agent can notice and route around — but only if it's told to look.

**"Factor it in WITHOUT being asked"** — repeated here in addition to the shared location block,
because for this agent it has a concrete deliverable attached: `regionalNotes`.

**The Output section** describes the report's *shape* even though the schema enforces it. Naming the
parts in prose measurably improves how well each one is populated — particularly
`regionalNotes`, which is otherwise left thin.

---

## The two research prompts

The research loop is split into two calls (see the README's design notes for why: a schema attached to
the searching call makes the model answer immediately and never search). Each phase has its own task
prompt.

### Phase 1 — the search task

```
<the completed form, rendered as readable text>

Research this thoroughly following your method. Gather your evidence with web_search, then summarise
what you found and cite the URLs you actually retrieved.
```

**Reasoning:** the form is rendered as `- Label (field_id): value` lines with empty answers skipped,
so the model sees only real signal. **"following your method"** points back at the numbered loop in
the system prompt instead of restating it. Crucially this prompt asks for a *summary of findings*, not
a report — the report is phase 2's job, and asking for it here would pull the agent toward answering
before it has searched.

### Phase 2 — the synthesis task

```
<the completed form, rendered as readable text>

## Evidence gathered during research
<phase 1's prose, or each step's reflections if the loop was cut off>

## Sources actually retrieved (cite by these ids ONLY)
[1] Toggl Track Pricing Plans | Toggl — https://toggl.com/track/pricing
    <snippet>
[2] ...

Write the final report now. Do not search again. Every citation must be an id from the list above,
and reproduce those sources (id, title, url) in the report's `sources`. If the evidence is thin, say
so in the summary rather than filling the gap with unsourced claims.
```

**Reasoning:**

- **The numbered source list is the core of the whole citation design.** The model cannot cite a URL
  it was never given, so citation ids resolve to pages that were genuinely retrieved.
- **"cite by these ids ONLY"** and **"Do not search again"** — this call has no need of tools, and the
  instruction removes any ambiguity about what to do with a gap.
- **"If the evidence is thin, say so… rather than filling the gap"** — the same anti-fabrication
  pressure as the system prompt, restated at the exact moment the temptation exists.
- **The form is repeated** so the report is framed around the user's actual decision rather than
  becoming a neutral summary of the sources.

### `web_search` tool description

```
Search the web for current, citable information. Returns ranked results with titles, URLs, and
snippets. Call repeatedly with focused queries to gather evidence before answering.
```

**"Call repeatedly"** and **"before answering"** are the operative words — they set the expectation of
a loop at the point of decision, reinforcing the method in the system prompt.
