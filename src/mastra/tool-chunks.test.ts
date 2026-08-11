import { describe, expect, it } from "vitest";
import { readToolCall, readToolResult } from "./tool-chunks";

/**
 * These guard the bug that made two features fail silently: `toolResults` items
 * are stream chunks with everything nested under `payload`, so reading
 * `chunk.toolName` yields undefined and the tool's output is dropped even though
 * the tool ran.
 *
 * The fixtures below are trimmed from output actually captured from
 * @mastra/core 0.24.9, so they pin the real shape rather than an assumed one.
 */

const REAL_TOOL_CALL = {
  type: "tool-call",
  runId: "d9285ffe-ddb3-4750-9d6b-da751458852a",
  from: "AGENT",
  payload: {
    toolCallId: "toolu_01WPAHn6jNfrg1wPceJG1G1N",
    toolName: "web_search",
    args: { query: "ASUS ROG Zephyrus G14 price Germany 2024", maxResults: 10 },
  },
};

const REAL_TOOL_RESULT = {
  type: "tool-result",
  runId: "d9285ffe-ddb3-4750-9d6b-da751458852a",
  from: "AGENT",
  payload: {
    args: { query: "ASUS ROG Zephyrus G14 price Germany 2024" },
    toolCallId: "toolu_01WPAHn6jNfrg1wPceJG1G1N",
    toolName: "web_search",
    result: {
      query: "ASUS ROG Zephyrus G14 price Germany 2024",
      results: [{ title: "T", url: "https://example.org/a", content: "…" }],
      usedMock: false,
    },
  },
};

describe("readToolResult", () => {
  it("reads a real Mastra tool-result chunk from its payload", () => {
    const tr = readToolResult<{ usedMock?: boolean }>(REAL_TOOL_RESULT);
    expect(tr?.toolName).toBe("web_search");
    expect(tr?.result?.usedMock).toBe(false);
  });

  it("tolerates a flat chunk, in case a future version un-nests payload", () => {
    const tr = readToolResult<{ ok: boolean }>({
      toolName: "submit_form_draft",
      result: { ok: true },
    });
    expect(tr?.toolName).toBe("submit_form_draft");
    expect(tr?.result).toEqual({ ok: true });
  });

  it("returns null for anything without a toolName", () => {
    expect(readToolResult({ type: "text-delta", payload: { text: "hi" } })).toBeNull();
    expect(readToolResult({ payload: {} })).toBeNull();
    expect(readToolResult({})).toBeNull();
    expect(readToolResult(null)).toBeNull();
    expect(readToolResult(undefined)).toBeNull();
    expect(readToolResult("tool-result")).toBeNull();
  });

  it("prefers the payload when both levels carry a toolName", () => {
    const tr = readToolResult({
      toolName: "outer",
      payload: { toolName: "inner", result: 1 },
    });
    expect(tr?.toolName).toBe("inner");
  });

  it("returns undefined result for a chunk that carries none", () => {
    const tr = readToolResult({ payload: { toolName: "web_search" } });
    expect(tr?.toolName).toBe("web_search");
    expect(tr?.result).toBeUndefined();
  });
});

describe("readToolCall", () => {
  it("reads a real Mastra tool-call chunk, including args", () => {
    const call = readToolCall<{ query?: string }>(REAL_TOOL_CALL);
    expect(call?.toolName).toBe("web_search");
    expect(call?.args?.query).toBe("ASUS ROG Zephyrus G14 price Germany 2024");
  });

  it("returns null for a non-tool chunk", () => {
    expect(readToolCall({ type: "finish", payload: {} })).toBeNull();
  });
});
