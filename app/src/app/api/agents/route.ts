import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import {
  agentSummary,
  deleteAgent,
  listAgents,
  upsertAgent,
  validAgentName,
} from "@/lib/agents";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json(
    { error: "db_unavailable", reason: isDbConfigured() ? "db_unreachable" : "db_not_configured" },
    { status: 503 },
  );
}

// GET /api/agents — registry with live presence + a summary block.
export async function GET() {
  const [agents, summary] = await Promise.all([listAgents(), agentSummary()]);
  if (agents === null) return unavailable();
  return NextResponse.json({ agents, summary });
}

// POST /api/agents — register or heartbeat (upsert by name).
// Body: { name, type?, description?, project?, current_task? }
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const { name, type, description, project, current_task } = (body ?? {}) as Record<string, unknown>;
  if (!validAgentName(name)) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  const agent = await upsertAgent({
    name,
    type: typeof type === "string" ? type : undefined,
    description: typeof description === "string" ? description : undefined,
    project: typeof project === "string" ? project : undefined,
    current_task: typeof current_task === "string" ? current_task : undefined,
  });
  if (!agent) return unavailable();
  return NextResponse.json({ agent }, { status: 201 });
}

// DELETE /api/agents?name=… — remove an agent from the registry (runs are kept).
export async function DELETE(request: Request) {
  const name = new URL(request.url).searchParams.get("name") ?? "";
  if (!validAgentName(name)) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  const ok = await deleteAgent(name);
  if (!ok) {
    return NextResponse.json(
      { error: "not_deleted", reason: isDbConfigured() ? "not_found" : "db_not_configured" },
      { status: isDbConfigured() ? 404 : 503 },
    );
  }
  return NextResponse.json({ deleted: name });
}
