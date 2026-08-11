/**
 * Tiny structured logger shared across the app (agents, tools, state machine).
 *
 * Kept dependency-free and isomorphic so it can be imported from both server
 * (Mastra tools/agents, API routes) and, if needed, the state machine on the
 * client. Every line is timestamped and scoped, which is what makes the
 * "log state changes" requirement legible in the terminal.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  ts: string;
  level: LogLevel;
  scope: string;
  msg: string;
  data?: unknown;
}

const ICONS: Record<LogLevel, string> = {
  debug: "·",
  info: "▸",
  warn: "⚠",
  error: "✖",
};

export function makeLogEntry(
  level: LogLevel,
  scope: string,
  msg: string,
  data?: unknown,
): LogEntry {
  return { ts: new Date().toISOString(), level, scope, msg, data };
}

function emit(entry: LogEntry) {
  const line = `${ICONS[entry.level]} [${entry.scope}] ${entry.msg}`;
  const args = entry.data !== undefined ? [line, entry.data] : [line];
  // Route to the matching console method so levels are filterable in devtools.
  if (entry.level === "error") console.error(...args);
  else if (entry.level === "warn") console.warn(...args);
  else console.log(...args);
}

function make(level: LogLevel) {
  return (scope: string, msg: string, data?: unknown) =>
    emit(makeLogEntry(level, scope, msg, data));
}

export const logger = {
  debug: make("debug"),
  info: make("info"),
  warn: make("warn"),
  error: make("error"),
};
