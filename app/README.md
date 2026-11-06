# AI Hub app

The hub's web surface — a Next.js (App Router, TypeScript, Tailwind) dashboard
that tiles the running services and exposes a health endpoint. It's the "front
door" of the hub; deeper panels/APIs get added here over time.

## Develop

```bash
cd app
npm install
npm run dev        # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`,
`npm run typecheck`. Tests (both run in CI against a real Postgres service):
- `npm run test:db` — exercises the `memory.ts` lib directly (set `DATABASE_URL`).
- `npm run test:http` — drives the `/api/*` routes over HTTP against a running
  server (set `BASE_URL`, default `http://localhost:3000`).

## Configuration

Everything degrades gracefully: no `DATABASE_URL` → the shared-brain panel shows a
hint instead of erroring; unreachable services → red health dots, page still
renders. Set these in Coolify (point URLs at your Tailscale hostname):

| Var | Purpose | Default |
|-----|---------|---------|
| `DATABASE_URL` | Postgres brain (enables `/api/memory` + panel) | _unset → brain disabled_ |
| `SVC_COOLIFY_URL` | Dashboard link + health probe | `http://localhost:8000` |
| `SVC_CODE_SERVER_URL` | " | `http://localhost:8080` |
| `SVC_N8N_URL` | " | `http://localhost:5678` |
| `SVC_HOMEPAGE_URL` | " | `http://localhost:3001` |
| `HUB_BASIC_AUTH_USER` / `HUB_BASIC_AUTH_PASSWORD` | Enable Basic Auth (both required) | _unset → open_ |

## Routes

- `/` — live service dashboard: health-probes each active service (server-side,
  short timeout), a write box, and the recent shared-brain feed. Auto-refreshes
  every ~20s (pauses when the tab is hidden). Rendered per request.
All pages share a persistent top nav (Dashboard · Brain · health). Destructive
actions (entry delete, link removal) use a two-step confirm that auto-reverts.

- `/brain` — full brain browser: search across content/agent/kind, **kind and
  agent filter chips** (with counts), a **pinned-only** toggle, **pagination**,
  **inline pin / edit / delete** per entry, a **#id permalink**, **export** +
  **feed** links (all carrying the active filters), plus the write box. Pinned
  entries float to the top. Auto-refreshes every ~30s.
- `/brain/[id]` — entry detail + **relations**: the same pin/copy/edit/delete
  controls as the list (deleting redirects back to `/brain`), linked entries
  (in/out, by relation), and a **type-ahead link picker** — search entries by
  content (or type `#id`) to create a link; remove links inline.
- `/agents` — the **agent command center**: live registry (presence pulses:
  online/idle/offline from heartbeats), stat tiles (online, running now,
  runs/failures per 24h), a 14-day runs sparkline, one-click registration
  presets (Claude Code · Codex · Hermes) + a custom form, and a filterable
  activity stream (by agent and status, paginated). Auto-refreshes every ~15s.
- `/agents/[name]` — agent detail: presence, project, current task, run history,
  that agent's shared-brain entries, and a two-step unregister (runs are kept).
- `/api/agents` — the registry.
  - `GET` → `{ agents: [{ …, presence, runs_24h, failed_24h }], summary }`.
  - `POST` `{ name, type?, description?, project?, current_task? }` → register
    or **heartbeat** (upsert by name; `last_seen` always advances) (201).
  - `DELETE ?name=…` → unregister (runs are kept).
- `/api/runs` — the activity stream.
  - `GET ?agent=&status=&limit=&offset=` → runs, newest first.
  - `POST` `{ agent, task, project?, status?, detail? }` → log a run (also
    heartbeats the agent; a `running` run becomes its current task) (201).
  - `PATCH ?id=` `{ status, detail? }` → finish/update (`done`/`failed` set
    `finished_at` and clear the agent's current task).
- `/api/health` — JSON liveness probe (`{ status: "ok", ... }`). Left open even
  when Basic Auth is on, so Docker/Coolify healthchecks work.
- `/api/memory` — the shared brain.
  - `GET /api/memory?limit=20&offset=0&q=term&kind=note&agent=claude&pinned=1` →
    recent (optionally filtered/paged) entries; pinned float first, then search
    relevance (Postgres full-text `ts_rank`, with substring fallback), then
    recency. Each row includes a `link_count` (relations touching it).
  - `POST /api/memory` `{ "content": "...", "agent"?, "kind"? }` → append (201).
  - `PATCH /api/memory?id=123` `{ "content"?, "kind"?, "pinned"? }` → update one
    entry (content/kind/pin state).
  - `DELETE /api/memory?id=123` → remove one entry.
- `/api/stats` — brain counts: `{ total, pinned, byKind[], byAgent[], perDay[],
  lastAt }` (feeds the dashboard stat tiles, 14-day activity sparkline, kind
  chart, and the `/brain` filter chips).
- `/api/export?format=json|csv&q=&kind=&agent=` → download the (filtered) brain
  as JSON or CSV (with a `Content-Disposition` attachment).
- `/api/feed?format=json|rss&kind=&agent=` → recent context as a subscribable
  feed (JSON Feed 1.1 or RSS 2.0) for external readers.
- `/api/links` — relations between entries.
  - `GET /api/links?id=123` → related entries (both directions).
  - `POST /api/links` `{ from_id, to_id, rel? }` → create a link (201).
  - `DELETE /api/links?link_id=123` → remove a link.

## Agent command center — integrating agents

All agents report through one interface: `POST /api/agents` (heartbeat) and
`POST`/`PATCH /api/runs` (work log). [`scripts/agent-report.sh`](../scripts/agent-report.sh)
wraps both — set `HUB_URL` (e.g. `http://<tailscale-ip>:3000`) and
`HUB_API_TOKEN` (when the API is gated):

```bash
scripts/agent-report.sh heartbeat <name> [type] [task] [project]
id=$(scripts/agent-report.sh run-start <name> "<task>" [project])
scripts/agent-report.sh run-done "$id" "detail"      # or run-fail
```

- **Claude Code** — one-click register the `claude-code` preset on `/agents`,
  then have sessions heartbeat: add to the repo's `CLAUDE.md` workflow (or a
  `SessionStart` hook) —
  `scripts/agent-report.sh heartbeat claude-code claude-code "<current task>" <repo>`.
- **Codex** — wrap invocations:
  `id=$(scripts/agent-report.sh run-start codex "<prompt summary>")`, run
  `codex exec …`, then `run-done`/`run-fail "$id"`.
- **Hermes** — register the preset now (it shows **offline** until a GPU host
  exists — see `DECISIONS.md` D-0010); when it runs, its wrapper heartbeats like
  any other agent.
- **n8n** — an HTTP node POSTing to `/api/agents` on a schedule makes n8n's own
  health visible too.

Presence is derived from heartbeats: **online** < 2 min, **idle** < 15 min,
**offline** after.

## Shared brain (Postgres)

Schema in [`db/schema.sql`](./db/schema.sql) (`hub_memory` table). The app creates
it on demand; you can also apply it manually:
`psql "$DATABASE_URL" -f db/schema.sql`.

## Auth

Two independent, additive gates (both no-ops when unset — see `src/middleware.ts`):

- **`HUB_BASIC_AUTH_USER` + `HUB_BASIC_AUTH_PASSWORD`** — HTTP Basic Auth for the
  browser UI (and the API).
- **`HUB_API_TOKEN`** — a bearer token authorizing `/api/*` for programmatic
  clients. **Set this whenever Basic Auth is on**, otherwise agents and n8n get
  401 on writes. Clients send `Authorization: Bearer <token>` or
  `X-Api-Token: <token>` (the shipped n8n workflows already send the header).

`/api/health` stays open for healthchecks. Comparisons are constant-time. This is
a second layer on top of Tailscale, not a replacement for it.

## Deploy

Built as a standalone image via [`Dockerfile`](./Dockerfile) (`output:
"standalone"`). The root `docker-compose.yml` `hub-app` service builds this
directory; Coolify can auto-redeploy it from Git on push. Runs on port 3000
(loopback-bound; reach it via Tailscale / the Coolify proxy).
