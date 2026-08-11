import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResearchEvent } from "@/mastra/schemas";
import { runResearchStream, sendInterviewTurn } from "./client-api";

/**
 * The SSE reader, tested at the byte level.
 *
 * A frame can be split across network reads mid-JSON. That depends on packet
 * timing, so it cannot be reproduced by clicking through the app — but if the
 * buffering is wrong, progress events vanish or the report is lost entirely.
 * Here the chunk boundaries are chosen deliberately.
 */

const form = { title: "t", fields: [{ id: "a", label: "A", type: "text" as const }] };
const location = { country: "Germany", countryCode: "DE" };
const input = { form, answers: {}, location } as Parameters<typeof runResearchStream>[0];

/** Build a Response whose body streams exactly the given chunks, in order. */
function sseResponse(chunks: string[], init?: ResponseInit): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200, ...init });
}

const frame = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;

function stubFetch(response: Response | Promise<Response>) {
  const fetchMock = vi.fn(() => Promise.resolve(response));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runResearchStream", () => {
  it("delivers progress events in order and returns the final report", async () => {
    stubFetch(
      sseResponse([
        frame({ type: "planning", message: "Planning…" }),
        frame({ type: "search", message: "Searching: “a”" }),
        frame({ type: "search-result", message: "Found 3 sources.", data: { count: 3 } }),
        frame({
          type: "result",
          report: { title: "R", summary: "s", keyFindings: [], sections: [], sources: [] },
          usedMock: false,
          steps: 4,
        }),
      ]),
    );

    const events: ResearchEvent[] = [];
    const result = await runResearchStream(input, (e) => events.push(e));

    expect(events.map((e) => e.type)).toEqual(["planning", "search", "search-result"]);
    expect(events[2].data).toEqual({ count: 3 });
    expect(result.report.title).toBe("R");
    expect(result.steps).toBe(4);
    expect(result.usedMock).toBe(false);
  });

  it("does not emit the result frame as a progress event", async () => {
    stubFetch(
      sseResponse([
        frame({
          type: "result",
          report: { title: "R", summary: "s", keyFindings: [], sections: [], sources: [] },
        }),
      ]),
    );

    const events: ResearchEvent[] = [];
    await runResearchStream(input, (e) => events.push(e));
    expect(events).toEqual([]);
  });

  it("reassembles a frame split across reads mid-JSON", async () => {
    // The boundary falls inside the `message` string's JSON.
    stubFetch(
      sseResponse([
        'data: {"type":"search","mess',
        'age":"Searching: half"}\n\n',
        frame({
          type: "result",
          report: { title: "R", summary: "s", keyFindings: [], sections: [], sources: [] },
        }),
      ]),
    );

    const events: ResearchEvent[] = [];
    await runResearchStream(input, (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0].message).toBe("Searching: half");
  });

  it("handles several frames arriving in a single read", async () => {
    stubFetch(
      sseResponse([
        frame({ type: "search", message: "one" }) +
          frame({ type: "search", message: "two" }) +
          frame({
            type: "result",
            report: { title: "R", summary: "s", keyFindings: [], sections: [], sources: [] },
          }),
      ]),
    );

    const events: ResearchEvent[] = [];
    await runResearchStream(input, (e) => events.push(e));
    expect(events.map((e) => e.message)).toEqual(["one", "two"]);
  });

  it("processes a trailing frame with no terminating blank line", async () => {
    stubFetch(
      sseResponse([
        frame({ type: "search", message: "one" }),
        'data: {"type":"result","report":{"title":"R","summary":"s","keyFindings":[],"sections":[],"sources":[]}}',
      ]),
    );

    const result = await runResearchStream(input, () => {});
    expect(result.report.title).toBe("R");
  });

  it("rejects with the agent's message when an error frame arrives", async () => {
    stubFetch(
      sseResponse([
        frame({ type: "search", message: "one" }),
        frame({ type: "error", message: "search backend exploded" }),
      ]),
    );

    await expect(runResearchStream(input, () => {})).rejects.toThrow(
      "search backend exploded",
    );
  });

  it("still surfaces the error frame as an event so the UI can show it", async () => {
    stubFetch(sseResponse([frame({ type: "error", message: "boom" })]));

    const events: ResearchEvent[] = [];
    await expect(runResearchStream(input, (e) => events.push(e))).rejects.toThrow();
    expect(events.map((e) => e.type)).toEqual(["error"]);
  });

  it("rejects when the stream ends without a report", async () => {
    stubFetch(sseResponse([frame({ type: "planning", message: "Planning…" })]));

    await expect(runResearchStream(input, () => {})).rejects.toThrow(
      /ended without a report/,
    );
  });

  it("skips a garbled frame instead of aborting the stream", async () => {
    stubFetch(
      sseResponse([
        "data: {not json at all}\n\n",
        frame({ type: "search", message: "survived" }),
        frame({
          type: "result",
          report: { title: "R", summary: "s", keyFindings: [], sections: [], sources: [] },
        }),
      ]),
    );

    const events: ResearchEvent[] = [];
    const result = await runResearchStream(input, (e) => events.push(e));
    expect(events.map((e) => e.message)).toEqual(["survived"]);
    expect(result.report.title).toBe("R");
  });

  it("reports the server's error and detail on a non-2xx response", async () => {
    stubFetch(
      new Response(JSON.stringify({ error: "Invalid request", detail: "bad form" }), {
        status: 400,
      }),
    );

    await expect(runResearchStream(input, () => {})).rejects.toThrow(
      "Invalid request — bad form",
    );
  });

  it("falls back to the status code when the error body is not JSON", async () => {
    stubFetch(new Response("<html>502</html>", { status: 502 }));
    await expect(runResearchStream(input, () => {})).rejects.toThrow(
      "Request failed (502)",
    );
  });
});

describe("sendInterviewTurn", () => {
  it("posts the transcript and location, and returns reply plus form", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify({ reply: "hi", form: null }), { status: 200 }),
    );

    const result = await sendInterviewTurn(
      [{ role: "user", content: "hello" }],
      location as never,
    );

    expect(result).toEqual({ reply: "hi", form: null });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/form-builder");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      messages: [{ role: "user", content: "hello" }],
      location,
    });
  });

  it("surfaces a 503 when the API key is missing", async () => {
    stubFetch(
      new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not set." }), {
        status: 503,
      }),
    );

    await expect(
      sendInterviewTurn([{ role: "user", content: "x" }], location as never),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});
