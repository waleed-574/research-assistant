import { NextRequest, NextResponse } from "next/server";
import { geolocateIp } from "@/mastra/tools/geolocate";

/**
 * GET /api/geolocate
 * Detects the caller's location from their request IP. Requires NO API key,
 * so it's the first thing the research app calls on load. The client keeps the
 * result and may let the user override it.
 */
export async function GET(request: NextRequest) {
  // x-forwarded-for is a comma-separated list; the first entry is the client.
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || undefined;

  const location = await geolocateIp(ip);
  return NextResponse.json(location);
}
