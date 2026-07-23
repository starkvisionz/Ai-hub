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
- `/brain` — full brain browser: search across content/agent/kind, **kind and
  agent filter chips** (with counts), a **pinned-only** toggle, **pagination**,
  **inline pin / edit / delete** per entry, a **#id permalink**, **export** +
  **feed** links, plus the write box. Pinned entries float to the top.
  Auto-refreshes every ~30s.
- `/brain/[id]` — entry detail + **relations**: shows the entry and its linked
  entries (in/out, by relation), with a form to link another entry by id and a
  remove-link control.
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

## Shared brain (Postgres)

Schema in [`db/schema.sql`](./db/schema.sql) (`hub_memory` table). The app creates
it on demand; you can also apply it manually:
`psql "$DATABASE_URL" -f db/schema.sql`.

## Auth

Set `HUB_BASIC_AUTH_USER` + `HUB_BASIC_AUTH_PASSWORD` to gate the dashboard behind
HTTP Basic Auth (see `src/middleware.ts`). Leave unset for frictionless local dev.
This is a second layer on top of Tailscale, not a replacement for it.

## Deploy

Built as a standalone image via [`Dockerfile`](./Dockerfile) (`output:
"standalone"`). The root `docker-compose.yml` `hub-app` service builds this
directory; Coolify can auto-redeploy it from Git on push. Runs on port 3000
(loopback-bound; reach it via Tailscale / the Coolify proxy).
