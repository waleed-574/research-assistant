import { NextResponse } from "next/server";
import { mastra } from "@/mastra";

// Simple smoke-test endpoint: confirms the server boots AND that the Mastra
// instance imports cleanly inside a route handler. Visit /api/health.
export async function GET() {
  return NextResponse.json({
    status: "ok",
    mastra: mastra instanceof Object,
    agents: Object.keys(mastra.getAgents?.() ?? {}),
  });
}
