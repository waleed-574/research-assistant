import { NextRequest } from "next/server";
import { z } from "zod";
import { runResearch } from "@/mastra/research/run-research";
import { hasAnthropicKey } from "@/mastra/model";
import { LocationSchema, FormGraphSchema } from "@/mastra/schemas";
import { researchMaxSteps, fixturesEnabled } from "@/mastra/config";
import {
  fixtureReport,
  fixtureResearchEvents,
  fixtureResearchSteps,
} from "@/mastra/fixtures";
import { logger } from "@/lib/logger";

/**
 * POST /api/research
 * Runs the Research Agent's agentic loop and streams progress to the client
 * as Server-Sent Events. Each loop event (planning, search, search-result,
 * synthesizing) is sent as it happens; the final message carries the report.
 *
 * SSE (not a single JSON response) is what powers the live progress indicator
 * and keeps the connection from looking "hung" during a multi-step search.
 */

const AnswerValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

const RequestSchema = z.object({
  form: FormGraphSchema,
  answers: z.record(z.string(), AnswerValue),
  location: LocationSchema,
});

/** Replayed event spacing. Fast enough not to be tedious, slow enough that the
 *  progress UI actually animates the way it does on a live run. */
const FIXTURE_EVENT_DELAY_MS = 90;

export async function POST(request: NextRequest) {
  const fixtures = fixturesEnabled();

  // The key check comes second: in fixture mode no key is needed.
  if (!fixtures && !hasAnthropicKey()) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  let parsed;
  try {
    parsed = RequestSchema.parse(await request.json());
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid request", detail: String(err) }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { form, answers, location } = parsed;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        if (fixtures) {
          // Replay a captured run over the same SSE contract, paced so the
          // progress UI behaves as it does live. No API call, no cost.
          logger.info(
            "api/research",
            `fixture mode — replaying ${fixtureResearchEvents.length} events (no API call)`,
          );
          for (const event of fixtureResearchEvents) {
            send(event);
            await new Promise((r) => setTimeout(r, FIXTURE_EVENT_DELAY_MS));
          }
          send({
            type: "result",
            report: fixtureReport,
            usedMock: false,
            steps: fixtureResearchSteps,
          });
          return;
        }

        const { report, usedMock, steps } = await runResearch({
          form,
          answers,
          location,
          maxSteps: researchMaxSteps(),
          onEvent: (e) => send(e),
        });
        send({ type: "result", report, usedMock, steps });
      } catch (err) {
        logger.error("api/research", "research failed", String(err));
        send({ type: "error", message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
