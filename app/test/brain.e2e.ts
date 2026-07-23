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
} from "../src/lib/memory";

async function main() {
  // Clean slate so the run is deterministic.
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

  // Full-text-ish search across content/agent/kind.
  const s = await recentMemory({ q: "deploy" });
  assert.equal(s?.length, 1, "search finds one");
  assert.equal(s?.[0].agent, "n8n", "search matched the right row");

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

  // Delete.
  assert.equal(await deleteMemory(c!.id), true, "delete returns true");
  assert.equal((await recentMemory({ limit: 10 }))?.length, 2, "count after delete");
  assert.equal(await deleteMemory(c!.id), false, "re-delete returns false");

  console.log("DB E2E: all assertions passed ✓");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("DB E2E failed:", err);
    process.exit(1);
  });
