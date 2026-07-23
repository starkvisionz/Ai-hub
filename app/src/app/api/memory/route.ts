import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { addMemory, recentMemory } from "@/lib/memory";

export const dynamic = "force-dynamic";

// GET /api/memory?limit=20 — recent shared-brain entries.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");
  const q = searchParams.get("q") ?? undefined;
  const rows = await recentMemory(Number.isFinite(limit) ? limit : 20, q);
  if (rows === null) {
    return NextResponse.json(
      { available: false, reason: isDbConfigured() ? "db_unreachable" : "db_not_configured", entries: [] },
      { status: 200 },
    );
  }
  return NextResponse.json({ available: true, entries: rows });
}

// POST /api/memory — append an entry. Body: { agent?, kind?, content }.
// Lets agents and n8n workflows write shared context into the brain.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const { content, agent, kind } = (body ?? {}) as Record<string, unknown>;
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "content_required" }, { status: 400 });
  }
  const entry = await addMemory({
    content,
    agent: typeof agent === "string" ? agent : undefined,
    kind: typeof kind === "string" ? kind : undefined,
  });
  if (!entry) {
    return NextResponse.json(
      { error: "db_unavailable", reason: isDbConfigured() ? "db_unreachable" : "db_not_configured" },
      { status: 503 },
    );
  }
  return NextResponse.json({ entry }, { status: 201 });
}
