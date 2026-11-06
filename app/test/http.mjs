// HTTP integration test: drives the real API routes over the network against a
// running server + Postgres. Complements brain.e2e.ts (which tests the lib
// directly). Point BASE_URL at a running standalone server; exits non-zero on
// any failure. Only touches /api/* (no static assets required).
//
// If HUB_API_TOKEN is set, requests carry `Authorization: Bearer <token>` and an
// extra assertion verifies that tokenless API writes are rejected — this covers
// the auth-enabled path (agents/n8n writing to the brain).

const BASE = process.env.BASE_URL || "http://localhost:3000";
const TOKEN = process.env.HUB_API_TOKEN || "";
// Unique per invocation: runs survive unregister (by design), and CI executes
// this suite twice against one database (open + auth mode) — a fixed agent name
// would see the previous pass's runs in the filter assertions.
const AGENT = "http-agent-" + Date.now();

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("ok:", msg);
  }
};
const json = (r) => r.json().catch(() => ({}));

// fetch wrapper that injects the bearer token (when configured).
function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;
  return fetch(`${BASE}${path}`, { ...opts, headers });
}
const jsonHeaders = { "content-type": "application/json" };

async function main() {
  let r = await api("/api/health");
  ok(r.status === 200, "health 200");

  if (TOKEN) {
    // Tokenless write must be rejected when the API is gated.
    const noauth = await fetch(`${BASE}/api/memory`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ content: "should be blocked" }),
    });
    ok(noauth.status === 401, "tokenless API write blocked (401)");
  }

  // Create two entries.
  r = await api("/api/memory", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ content: "http integration entry", agent: "http-test", kind: "note" }),
  });
  ok(r.status === 201, "create 201");
  const { entry } = await json(r);
  ok(entry?.id > 0, "create returns id");
  const id = entry.id;

  r = await api("/api/memory", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ content: "link target", agent: "http-test", kind: "note" }),
  });
  const { entry: e2 } = await json(r);
  const id2 = e2.id;

  // Bad create.
  r = await api("/api/memory", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ content: "  " }),
  });
  ok(r.status === 400, "empty content 400");

  // Search (ranked full-text) + agent filter.
  r = await api("/api/memory?q=integration&agent=http-test");
  const list = await json(r);
  ok(list.entries?.some((x) => x.id === id), "search finds entry");

  // Pin, then pinned filter.
  r = await api(`/api/memory?id=${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ pinned: true }),
  });
  ok(r.status === 200, "pin 200");
  ok((await json(r)).entry?.pinned === true, "pinned true");
  r = await api("/api/memory?pinned=1");
  ok((await json(r)).entries?.some((x) => x.id === id), "pinned filter includes it");

  // Link the two, then read relations.
  r = await api("/api/links", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ from_id: id, to_id: id2, rel: "relates-to" }),
  });
  ok(r.status === 201, "link 201");
  r = await api(`/api/links?id=${id}`);
  const links = await json(r);
  ok(links.related?.length === 1, "one relation listed");
  ok(links.related?.[0]?.entry?.id === id2, "relation target correct");
  // Self-link rejected.
  r = await api("/api/links", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ from_id: id, to_id: id }),
  });
  ok(r.status === 400, "self-link 400");

  // Stats / export / feed content types.
  r = await api("/api/stats");
  const st = await json(r);
  ok(st.available === true && st.total >= 2, "stats available");
  r = await api("/api/export?format=csv&agent=http-test");
  ok((r.headers.get("content-type") || "").includes("text/csv"), "export csv content-type");
  r = await api("/api/feed?format=rss");
  ok((r.headers.get("content-type") || "").includes("rss"), "feed rss content-type");

  // ── Agent command center endpoints ──
  r = await api("/api/agents", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ name: AGENT, type: "codex", project: "ai-hub" }),
  });
  ok(r.status === 201, "agent register 201");
  r = await api("/api/agents", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ name: "bad name!" }),
  });
  ok(r.status === 400, "bad agent name 400");
  r = await api("/api/agents");
  const reg = await json(r);
  ok(reg.agents?.some((a) => a.name === AGENT && a.presence === "online"), "agent listed online");
  ok(typeof reg.summary?.agents === "number", "agents summary present");

  r = await api("/api/runs", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ agent: AGENT, task: "http run" }),
  });
  ok(r.status === 201, "run start 201");
  const runId = (await json(r)).run?.id;
  ok(runId > 0, "run id returned");
  r = await api(`/api/runs?id=${runId}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ status: "done", detail: "fin" }),
  });
  ok(r.status === 200, "run done 200");
  ok((await json(r)).run?.finished_at != null, "run finished_at set");
  r = await api(`/api/runs?agent=${AGENT}`);
  ok((await json(r)).runs?.length === 1, "runs filter by agent");
  r = await api("/api/runs", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ agent: AGENT }),
  });
  ok(r.status === 400, "run without task 400");
  r = await api(`/api/agents?name=${AGENT}`, { method: "DELETE" });
  ok(r.status === 200, "agent unregister 200");

  // Delete (cascades the link) + bad delete.
  r = await api(`/api/memory?id=${id}`, { method: "DELETE" });
  ok(r.status === 200, "delete 200");
  await api(`/api/memory?id=${id2}`, { method: "DELETE" });
  r = await api("/api/memory?id=abc", { method: "DELETE" });
  ok(r.status === 400, "delete bad id 400");

  if (failed) {
    console.error(`HTTP E2E: ${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log(`HTTP E2E: all passed ✓${TOKEN ? " (auth mode)" : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
