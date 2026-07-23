import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Liveness probe for Coolify / Docker healthchecks and uptime monitors.
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ai-hub-app",
    time: new Date().toISOString(),
  });
}
