import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { listRuns, logRun, updateRun, validAgentName } from "@/lib/agents";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json(
    { error: "db_unavailable", reason: isDbConfigured() ? "db_unreachable" : "db_not_configured" },
    { status: 503 },
  );
}

// GET /api/runs?agent=&status=&limit=&offset= — activity stream, newest first.
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const limit = Number(sp.get("limit") ?? "30");
  const offset = Number(sp.get("offset") ?? "0");
  const runs = await listRuns({
    agent: sp.get("agent") ?? undefined,
    status: sp.get("status") ?? undefined,
    limit: Number.isFinite(limit) ? limit : 30,
    offset: Number.isFinite(offset) ? offset : 0,
  });
  if (runs === null) return unavailable();
  return NextResponse.json({ runs });
}

// POST /api/runs — log a run (also heartbeats the agent).
// Body: { agent, task, project?, status? (running|done|failed), detail? }
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const { agent, task, project, status, detail } = (body ?? {}) as Record<string, unknown>;
  if (!validAgentName(agent) || typeof task !== "string" || !task.trim()) {
    return NextResponse.json({ error: "agent_and_task_required" }, { status: 400 });
  }
  const run = await logRun({
    agent,
    task,
    project: typeof project === "string" ? project : undefined,
    status: typeof status === "string" ? status : undefined,
    detail: typeof detail === "string" ? detail : undefined,
  });
  if (!run) return unavailable();
  return NextResponse.json({ run }, { status: 201 });
}

// PATCH /api/runs?id=123 — update a run's status (done/failed sets finished_at).
// Body: { status, detail? }
export async function PATCH(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const { status, detail } = (body ?? {}) as Record<string, unknown>;
  if (typeof status !== "string") {
    return NextResponse.json({ error: "status_required" }, { status: 400 });
  }
  const run = await updateRun(id, {
    status,
    detail: typeof detail === "string" ? detail : undefined,
  });
  if (!run) {
    return NextResponse.json(
      { error: "not_updated", reason: isDbConfigured() ? "not_found_or_bad_status" : "db_not_configured" },
      { status: isDbConfigured() ? 400 : 503 },
    );
  }
  return NextResponse.json({ run });
}
