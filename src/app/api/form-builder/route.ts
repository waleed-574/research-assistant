import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mastra } from "@/mastra";
import { buildRuntimeContext } from "@/mastra/context";
import { hasAnthropicKey } from "@/mastra/model";
import { LocationSchema, FormGraphSchema, type FormGraph } from "@/mastra/schemas";
import { readToolResult } from "@/mastra/tool-chunks";
import { fixturesEnabled } from "@/mastra/config";
import {
  fixtureForm,
  FIXTURE_FORM_REPLY,
  FIXTURE_INTERVIEW_QUESTION,
  FIXTURE_TURNS_BEFORE_FORM,
} from "@/mastra/fixtures";
import { logger } from "@/lib/logger";

/**
 * POST /api/form-builder
 * One turn of the interview. Sends the running chat transcript + the user's
 * location to the Form Builder Agent and returns the assistant's reply plus,
 * if the agent proposed a form this turn, the validated form graph.
 *
 * The route is a thin adapter: no agent logic lives here (it's all in
 * src/mastra). It just validates I/O and injects runtime context.
 */

const RequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
  location: LocationSchema,
});

export async function POST(request: NextRequest) {
  const fixtures = fixturesEnabled();

  // The key check comes second: in fixture mode no key is needed.
  if (!fixtures && !hasAnthropicKey()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." },
      { status: 503 },
    );
  }

  let parsed;
  try {
    parsed = RequestSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request", detail: String(err) },
      { status: 400 },
    );
  }

  const { messages, location } = parsed;

  // Replay a captured response instead of calling the agent. Still goes through
  // the real request validation above, so the client contract is unchanged.
  if (fixtures) {
    const userTurns = messages.filter((m) => m.role === "user").length;
    const proposeForm = userTurns >= FIXTURE_TURNS_BEFORE_FORM;
    logger.info(
      "api/form-builder",
      `fixture mode — ${proposeForm ? "proposing form" : "asking a question"} (no API call)`,
    );
    return NextResponse.json({
      reply: proposeForm ? FIXTURE_FORM_REPLY : FIXTURE_INTERVIEW_QUESTION,
      form: proposeForm ? fixtureForm : null,
    });
  }

  const runtimeContext = buildRuntimeContext(location);

  // Narrow each role to a single literal so the array matches Mastra's
  // discriminated MessageInput union (a `"user" | "assistant"` union role
  // would not).
  const modelMessages = messages.map((m) =>
    m.role === "user"
      ? { role: "user" as const, content: m.content }
      : { role: "assistant" as const, content: m.content },
  );

  try {
    const agent = mastra.getAgent("formBuilder");
    const result = await agent.generate(modelMessages, {
      runtimeContext,
      maxSteps: 4,
    });

    // If the agent called submit_form_draft this turn, surface the form graph.
    let form: FormGraph | null = null;
    for (const chunk of result.toolResults ?? []) {
      const tr = readToolResult(chunk);
      if (tr?.toolName !== "submit_form_draft") continue;
      const check = FormGraphSchema.safeParse(tr.result);
      if (check.success) {
        form = check.data;
      } else {
        // The tool's outputSchema already validated this, so a failure here
        // means the shapes have drifted — log it instead of silently
        // returning "no form" while the agent's reply claims otherwise.
        logger.error(
          "api/form-builder",
          "submit_form_draft result failed FormGraphSchema",
          String(check.error),
        );
      }
    }

    return NextResponse.json({ reply: result.text, form });
  } catch (err) {
    logger.error("api/form-builder", "agent error", String(err));
    return NextResponse.json(
      { error: "Agent failed", detail: String(err) },
      { status: 500 },
    );
  }
}
