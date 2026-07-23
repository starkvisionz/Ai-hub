import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { memoryStats } from "@/lib/memory";

export const dynamic = "force-dynamic";

// GET /api/stats — shared-brain counts (total, by kind, last activity).
export async function GET() {
  const stats = await memoryStats();
  if (stats === null) {
    return NextResponse.json({
      available: false,
      reason: isDbConfigured() ? "db_unreachable" : "db_not_configured",
    });
  }
  return NextResponse.json({ available: true, ...stats });
}
