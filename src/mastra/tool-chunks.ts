/**
 * Readers for Mastra's tool call/result *chunks*.
 *
 * `agent.generate()` (and the `onStepFinish` step objects) expose `toolCalls` /
 * `toolResults` as stream chunks, not flat records — the interesting fields sit
 * one level down under `payload`:
 *
 *   { type: 'tool-result', runId, from: 'AGENT',
 *     payload: { toolCallId, toolName, args, result } }
 *
 * Reading `chunk.toolName` / `chunk.result` directly yields `undefined`, which
 * fails silently: the tool really ran, but its output is dropped. These helpers
 * keep that shape knowledge in one place and tolerate a flat chunk too, so a
 * future Mastra version that un-nests the payload won't break callers.
 */

export interface ToolCallView<TArgs = unknown> {
  toolName: string;
  args?: TArgs;
}

export interface ToolResultView<TResult = unknown> {
  toolName: string;
  result?: TResult;
}

/** Narrow an unknown chunk to `{ toolName, ...fields }`, preferring `payload`. */
function unwrap(chunk: unknown): Record<string, unknown> | null {
  if (typeof chunk !== "object" || chunk === null) return null;
  const outer = chunk as Record<string, unknown>;
  const payload = outer.payload;
  const inner =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : outer;
  return typeof inner.toolName === "string" ? inner : null;
}

export function readToolCall<TArgs = unknown>(
  chunk: unknown,
): ToolCallView<TArgs> | null {
  const c = unwrap(chunk);
  if (!c) return null;
  return { toolName: c.toolName as string, args: c.args as TArgs | undefined };
}

export function readToolResult<TResult = unknown>(
  chunk: unknown,
): ToolResultView<TResult> | null {
  const c = unwrap(chunk);
  if (!c) return null;
  return {
    toolName: c.toolName as string,
    result: c.result as TResult | undefined,
  };
}
