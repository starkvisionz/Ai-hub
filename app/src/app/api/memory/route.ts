import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { addMemory, deleteMemory, editMemory, recentMemory } from "@/lib/memory";

export const dynamic = "force-dynamic";

// GET /api/memory?limit=20 — recent shared-brain entries.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "20");
  const offset = Number(searchParams.get("offset") ?? "0");
  const q = searchParams.get("q") ?? undefined;
  const kind = searchParams.get("kind") ?? undefined;
  const rows = await recentMemory({
    limit: Number.isFinite(limit) ? limit : 20,
    offset: Number.isFinite(offset) ? offset : 0,
    q,
    kind,
  });
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

// PATCH /api/memory?id=123 — update content and/or kind. Body: { content?, kind? }.
export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const { content, kind } = (body ?? {}) as Record<string, unknown>;
  const entry = await editMemory(id, {
    content: typeof content === "string" ? content : undefined,
    kind: typeof kind === "string" ? kind : undefined,
  });
  if (!entry) {
    return NextResponse.json(
      { error: "not_updated", reason: isDbConfigured() ? "not_found_or_no_fields" : "db_not_configured" },
      { status: isDbConfigured() ? 400 : 503 },
    );
  }
  return NextResponse.json({ entry });
}

// DELETE /api/memory?id=123 — remove one entry.
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const ok = await deleteMemory(id);
  if (!ok) {
    return NextResponse.json(
      { error: "not_deleted", reason: isDbConfigured() ? "not_found_or_unreachable" : "db_not_configured" },
      { status: isDbConfigured() ? 404 : 503 },
    );
  }
  return NextResponse.json({ deleted: id });
}
