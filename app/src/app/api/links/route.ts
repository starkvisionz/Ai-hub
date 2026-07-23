import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { addLink, deleteLink, linksFor } from "@/lib/memory";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json(
    { error: "db_unavailable", reason: isDbConfigured() ? "db_unreachable" : "db_not_configured" },
    { status: 503 },
  );
}

// GET /api/links?id=123 — related entries (both directions) for an entry.
export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const related = await linksFor(id);
  if (related === null) return unavailable();
  return NextResponse.json({ related });
}

// POST /api/links — create a link. Body: { from_id, to_id, rel? }.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const { from_id, to_id, rel } = (body ?? {}) as Record<string, unknown>;
  const fromId = Number(from_id);
  const toId = Number(to_id);
  if (![fromId, toId].every((n) => Number.isInteger(n) && n > 0) || fromId === toId) {
    return NextResponse.json({ error: "invalid_ids" }, { status: 400 });
  }
  const ok = await addLink(fromId, toId, typeof rel === "string" ? rel : undefined);
  if (!ok) return unavailable();
  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE /api/links?link_id=123 — remove a link.
export async function DELETE(request: Request) {
  const linkId = Number(new URL(request.url).searchParams.get("link_id"));
  if (!Number.isInteger(linkId) || linkId <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const ok = await deleteLink(linkId);
  if (!ok) {
    return NextResponse.json(
      { error: "not_deleted", reason: isDbConfigured() ? "not_found" : "db_not_configured" },
      { status: isDbConfigured() ? 404 : 503 },
    );
  }
  return NextResponse.json({ deleted: linkId });
}
