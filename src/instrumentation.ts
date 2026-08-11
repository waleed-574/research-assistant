// Next.js runs this once on server startup.
// We opt out of Mastra's deprecated telemetry to keep the console clean;
// the app uses Mastra's logger for observability instead.
export async function register() {
  (globalThis as { ___MASTRA_TELEMETRY___?: boolean }).___MASTRA_TELEMETRY___ =
    true;
}
