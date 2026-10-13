// End-to-end test of the shared-brain data layer against a REAL Postgres.
// Exercises the actual memory.ts functions (not duplicated SQL). Requires
// DATABASE_URL; run via `npm run test:db`. Exits non-zero on any failure.

import assert from "node:assert/strict";
import { query } from "../src/lib/db";
import {
  addMemory,
  recentMemory,
  editMemory,
  deleteMemory,
  memoryStats,
  exportMemory,
  getMemory,
  addLink,
  linksFor,
  deleteLink,
} from "../src/lib/memory";
import {
  upsertAgent,
  listAgents,
  getAgent,
  deleteAgent,
  logRun,
  updateRun,
  listRuns,
  agentSummary,
} from "../src/lib/agents";

async function main() {
  // Clean slate so the run is deterministic (drop links first: FK dependency).
  await query("DROP TABLE IF EXISTS hub_links");
  await query("DROP TABLE IF EXISTS hub_runs");
  await query("DROP TABLE IF EXISTS hub_agents");
  const dropped = await query("DROP TABLE IF EXISTS hub_memory");
  assert.ok(dropped !== null, "DB reachable (DROP TABLE)");

  // Insert (ensureSchema runs on first call).
  const a = await addMemory({ content: "hello world", agent: "claude", kind: "note" });
  assert.ok(a && a.id > 0, "insert returns a row");
  assert.equal(a!.pinned, false, "new entry not pinned");
  const b = await addMemory({ content: "deploy finished", agent: "n8n", kind: "event" });
  const c = await addMemory({ content: "another note", agent: "claude", kind: "note" });
  assert.ok(b && c, "further inserts ok");

  // Recent / count.
  assert.equal((await recentMemory({ limit: 10 }))?.length, 3, "3 entries listed");

  // Search across content/agent/kind (full-text + substring).
  const s = await recentMemory({ q: "deploy" });
  assert.equal(s?.length, 1, "search finds one");
  assert.equal(s?.[0].agent, "n8n", "search matched the right row");
  // Stemmed full-text match (deployed -> deploy) and partial-word (substring).
  assert.equal((await recentMemory({ q: "deployed" }))?.length, 1, "stemmed FTS match");
  assert.equal((await recentMemory({ q: "depl" }))?.length, 1, "substring match");

  // Exact filters.
  assert.equal((await recentMemory({ kind: "note" }))?.length, 2, "kind filter");
  assert.equal((await recentMemory({ agent: "claude" }))?.length, 2, "agent filter");

  // Pagination.
  assert.equal((await recentMemory({ limit: 2, offset: 0 }))?.length, 2, "page 1");
  assert.equal((await recentMemory({ limit: 2, offset: 2 }))?.length, 1, "page 2");

  // Edit content + kind.
  const e = await editMemory(a!.id, { content: "updated", kind: "todo" });
  assert.equal(e?.content, "updated", "content updated");
  assert.equal(e?.kind, "todo", "kind updated");

  // Pin floats to the top.
  await editMemory(b!.id, { pinned: true });
  const withPin = await recentMemory({ limit: 10 });
  assert.equal(withPin?.[0].id, b!.id, "pinned entry floats to top");
  assert.equal(withPin?.[0].pinned, true, "pinned flag set");
  assert.equal((await recentMemory({ pinnedOnly: true }))?.length, 1, "pinnedOnly filter");

  // Stats.
  const st = await memoryStats();
  assert.equal(st?.total, 3, "stats total");
  assert.equal(st?.pinned, 1, "stats pinned count");
  assert.equal(st?.byAgent.find((x) => x.agent === "claude")?.count, 2, "byAgent count");
  assert.ok((st?.byKind.length ?? 0) >= 1, "byKind present");
  assert.ok((st?.perDay.length ?? 0) >= 1, "perDay present");

  // Export (all + filtered).
  assert.equal((await exportMemory({}))?.length, 3, "export all");
  assert.equal((await exportMemory({ agent: "claude" }))?.length, 2, "export filtered");

  // getMemory.
  assert.equal((await getMemory(a!.id))?.id, a!.id, "getMemory by id");
  assert.equal(await getMemory(999999), null, "getMemory missing -> null");

  // Relations: link a<->b (out from a), and c->a (in to a).
  assert.equal(await addLink(a!.id, b!.id, "relates-to"), true, "addLink out");
  assert.equal(await addLink(c!.id, a!.id, "follows-up"), true, "addLink in");
  assert.equal(await addLink(a!.id, b!.id, "relates-to"), true, "addLink idempotent");
  assert.equal(await addLink(a!.id, a!.id, "self"), false, "no self-link");

  // link_count surfaces on list queries.
  const listed = await recentMemory({ limit: 10 });
  const aRow = listed?.find((x) => x.id === a!.id);
  assert.equal(aRow?.link_count, 2, "link_count reflects in+out links");

  const rel = await linksFor(a!.id);
  assert.equal(rel?.length, 2, "two related for a");
  assert.ok(rel?.some((r) => r.direction === "out" && r.entry.id === b!.id), "outgoing to b");
  assert.ok(rel?.some((r) => r.direction === "in" && r.entry.id === c!.id), "incoming from c");

  // Remove one link.
  const outLink = rel!.find((r) => r.direction === "out")!;
  assert.equal(await deleteLink(outLink.link_id), true, "deleteLink");
  assert.equal((await linksFor(a!.id))?.length, 1, "one related after unlink");

  // Cascade: deleting an entry removes its remaining links.
  assert.equal(await deleteMemory(c!.id), true, "delete returns true");
  assert.equal((await linksFor(a!.id))?.length, 0, "links cascade-removed on entry delete");
  assert.equal((await recentMemory({ limit: 10 }))?.length, 2, "count after delete");
  assert.equal(await deleteMemory(c!.id), false, "re-delete returns false");

  // ── Agent command center ──────────────────────────────────────────────────
  const ag = await upsertAgent({ name: "claude-code", type: "claude-code", description: "driver" });
  assert.ok(ag && ag.name === "claude-code", "agent registered");
  assert.equal(await upsertAgent({ name: "bad name!" }), null, "invalid agent name rejected");
  const hb = await upsertAgent({ name: "claude-code", current_task: "testing", project: "ai-hub" });
  assert.equal(hb?.current_task, "testing", "heartbeat sets task");
  assert.equal(hb?.type, "claude-code", "heartbeat keeps type");

  const agents = await listAgents();
  assert.equal(agents?.length, 1, "one agent listed");
  assert.equal(agents?.[0].presence, "online", "fresh heartbeat -> online");

  // Runs: start (becomes current task), finish (clears it), fail, filters.
  const run = await logRun({ agent: "codex", task: "generate tests", project: "ai-hub" });
  assert.ok(run && run.status === "running", "run started");
  assert.equal((await getAgent("codex"))?.current_task, "generate tests", "run upserts agent + task");
  const doneRun = await updateRun(run!.id, { status: "done", detail: "ok" });
  assert.equal(doneRun?.status, "done", "run finished");
  assert.ok(doneRun?.finished_at, "finished_at set");
  assert.equal((await getAgent("codex"))?.current_task, "", "finish clears current task");
  const failed = await logRun({ agent: "hermes", task: "warmup", status: "failed", detail: "no GPU" });
  assert.equal(failed?.status, "failed", "failed run logged");
  assert.equal((await listRuns({ status: "failed" }))?.length, 1, "status filter");
  assert.equal((await listRuns({ agent: "codex" }))?.length, 1, "agent filter");
  assert.equal(await updateRun(run!.id, { status: "nonsense" }), null, "bad status rejected");

  const summary = await agentSummary();
  assert.equal(summary?.agents, 3, "summary counts agents");
  assert.equal(summary?.runs_24h, 2, "summary counts runs");
  assert.equal(summary?.failed_24h, 1, "summary counts failures");
  assert.ok((summary?.perDay.length ?? 0) >= 1, "runs perDay present");

  assert.equal(await deleteAgent("hermes"), true, "agent unregistered");
  assert.equal((await listAgents())?.length, 2, "two agents left");
  assert.equal((await listRuns({ agent: "hermes" }))?.length, 1, "runs survive unregister");

  console.log("DB E2E: all assertions passed ✓");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("DB E2E failed:", err);
    process.exit(1);
  });
