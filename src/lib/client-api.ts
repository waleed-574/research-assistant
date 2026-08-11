import type {
  FormAnswers,
  FormGraph,
  ResearchEvent,
  ResearchReport,
  UserLocation,
} from "@/mastra/schemas";

/**
 * The browser's only view of the server. Every agent call goes through here, so
 * components deal in plain data and never touch Mastra or prompt text.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function errorFrom(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; detail?: string };
    return [body.error, body.detail].filter(Boolean).join(" — ") ||
      `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function fetchLocation(): Promise<UserLocation> {
  const response = await fetch("/api/geolocate");
  if (!response.ok) throw new Error(await errorFrom(response));
  return (await response.json()) as UserLocation;
}

export interface FormBuilderReply {
  reply: string;
  form: FormGraph | null;
}

/** One turn of the interview. Sends the whole transcript; the agent is stateless. */
export async function sendInterviewTurn(
  messages: ChatMessage[],
  location: UserLocation,
  signal?: AbortSignal,
): Promise<FormBuilderReply> {
  const response = await fetch("/api/form-builder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, location }),
    signal,
  });
  if (!response.ok) throw new Error(await errorFrom(response));
  return (await response.json()) as FormBuilderReply;
}

export interface ResearchResult {
  report: ResearchReport;
  usedMock: boolean;
  steps: number;
}

/**
 * One decoded SSE frame. The route streams progress events plus a final
 * `result` frame carrying the report, so the wire union is wider than
 * ResearchEvent alone.
 */
type ResearchFrame = {
  type: ResearchEvent["type"] | "result";
  message?: string;
  data?: unknown;
  report?: ResearchReport;
  usedMock?: boolean;
  steps?: number;
};

/**
 * Runs the research agent, invoking `onEvent` for each progress event as it
 * arrives. Uses fetch + a streamed body rather than EventSource because the
 * request is a POST with a JSON payload.
 */
export async function runResearchStream(
  input: { form: FormGraph; answers: FormAnswers; location: UserLocation },
  onEvent: (event: ResearchEvent) => void,
  signal?: AbortSignal,
): Promise<ResearchResult> {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok) throw new Error(await errorFrom(response));
  if (!response.body) throw new Error("The server returned no event stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ResearchResult | null = null;
  let failure: string | null = null;

  const handleFrame = (frame: string) => {
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    if (!data) return;

    let parsed: ResearchFrame | null = null;
    try {
      parsed = JSON.parse(data) as ResearchFrame;
    } catch {
      return; // Ignore a partial/garbled frame rather than killing the stream.
    }
    if (!parsed?.type) return;

    if (parsed.type === "result") {
      if (parsed.report) {
        result = {
          report: parsed.report,
          usedMock: Boolean(parsed.usedMock),
          steps: parsed.steps ?? 0,
        };
      }
      return;
    }
    if (parsed.type === "error") {
      failure = parsed.message || "The research agent reported an error.";
    }
    onEvent({ type: parsed.type, message: parsed.message ?? "", data: parsed.data });
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line; keep the trailing partial.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) handleFrame(frame);
  }
  if (buffer.trim()) handleFrame(buffer);

  if (failure) throw new Error(failure);
  if (!result) throw new Error("The research stream ended without a report.");
  return result;
}
