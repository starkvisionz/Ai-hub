# HANDOFF.md — Live State

> The running log. Fastest-changing file in the hub. Every session: read the top,
> do work, then update this before you leave. Newest entry on top.
> Durable facts live in [`CONTEXT.md`](./CONTEXT.md); rationale in
> [`DECISIONS.md`](./DECISIONS.md).

## Current status

**Phase 0 — Foundation.** Context docs + full Coolify/Docker stack **defined**
(code-server, postgres/pgvector, n8n, Homepage, restic; Ollama/Hermes commented
GPU-only). Nothing is **deployed** yet. VPS is provisioned (host IP known, kept
in `.env`, not committed). Open PR: **#1**.

## Resolved

- **GPU?** No — host is **KVM2 (CPU-only, ~2 vCPU / 8 GB RAM)**. Hermes/Ollama
  stays disabled; Claude is primary. Watch RAM (see `CONTEXT.md` resource budget).

## Next up (pick from here)

1. **On the VPS**, run [`scripts/bootstrap-vps.sh`](./scripts/bootstrap-vps.sh)
   (base hardening + Tailscale + Coolify). Deploy must run *on the box*, not from
   a dev sandbox.
2. **Rotate** any password shared in chat; switch to SSH keys; set
   `PermitRootLogin prohibit-password`.
3. **`tailscale up`** to join the tailnet; reach Coolify at `<tailscale-ip>:8000`.
4. **Import `docker-compose.yml`** into Coolify; map Persistent Storage
   (`postgres-data`, `./workspace`).
5. **Set real env vars** in Coolify (names in `.env.example`) — n8n key, restic
   repo + password + B2/S3 creds, etc. Never commit them.
6. **Pick a restic backend** (Backblaze B2 vs S3) and create the bucket.
7. **Decide the first project(s)** the hub coordinates → clone under
   `workspace/repos/`.
8. **Hub app** (`app/`): brain CRUD (add/edit/delete), search + kind filters +
   pagination, stat tiles + kind chart, live health, auto-refresh, Basic Auth,
   two n8n workflows, and CI are all done. Next candidates — a live-DB smoke test
   in CI (postgres service); entity/relations view; per-agent activity; export.
9. *(Later)* Forgejo, if Git sovereignty is wanted.

## Verify locally

```bash
cd app && npm install && npm run build   # green as of 2026-07-23
docker compose config -q                 # stack validates
```

## In flight

- _Nothing currently in flight._

## Recently done

- **2026-07-23** — Added a **live-DB E2E test** (PR #1) and **fixed a real bug**
  it caught: `pg` returned BIGSERIAL ids as strings, so edit/delete/pin were
  silent no-ops (`Number.isInteger` guard). Fixed via an int8→number type parser
  in `db.ts`; also ISO-formatted CSV timestamps. New `app/test/brain.e2e.ts`
  (exercises the real `memory.ts` fns) + `npm run test:db`; new CI job `db-e2e`
  runs it against a Postgres service. **Verified green against local Postgres 16.**
  Decision D-0015.
- **2026-07-23** — Added **activity sparkline + copy-as-markdown** (PR #1):
  `/api/stats` now returns `pinned` count + `perDay` (last 14 days); dashboard
  shows a pure-SVG 14-day activity **sparkline** and a pinned tile; each `/brain`
  entry has a **copy-as-markdown** action. Build + typecheck + lint green;
  dashboard/brain render verified (stats stay silent without a DB).
- **2026-07-23** — Added **pin/star + feed** (PR #1): `pinned` column (additive
  migration in `ensureSchema` + `db/schema.sql`); pinned entries **float to top**;
  inline **pin toggle** and a **pinned-only** filter on `/brain`;
  `GET /api/feed?format=json|rss` (JSON Feed 1.1 / RSS 2.0) for external readers,
  linked from `/brain`. Build + typecheck + lint green; pinned routes + feed
  (503 no-DB) smoke-tested.
- **2026-07-23** — Added **agent dimension + export** (PR #1): exact **agent
  filter** across the query layer + stats `byAgent`; **agent filter chips** on
  `/brain` (alongside kind chips); **export** the (filtered) brain as JSON or CSV
  via `GET /api/export` + Export buttons on `/brain`. Query filter extracted to a
  shared `buildFilter`. Build + typecheck + lint green; agent routes + export
  (503 no-DB, headers) smoke-tested.
- **2026-07-23** — Added **pagination, edit, kind chart, webhook workflow**
  (PR #1): `/brain` **pagination** (25/page, newer/older); **inline edit** per
  entry (`PATCH /api/memory?id=`) via `ManagedEntry`; a **kind-distribution bar
  chart** on the dashboard stats; a second n8n workflow
  (`n8n/webhook-to-brain.workflow.json`) exposing a webhook that funnels external
  events into the brain. `recentMemory` refactored to an options object with
  `offset`. Build + typecheck + lint green; PATCH/pagination/routes smoke-tested.
  (Live-DB E2E pending — no Docker daemon in the build sandbox; runs once the
  stack is up.) **CI is green on the prior commit.**
- **2026-07-23** — Added **manage + insight + CI** (PR #1): per-entry **delete**
  (`DELETE /api/memory?id=`), **kind filter chips** with counts + exact `kind`
  filter on `/brain`, **stat tiles** on the dashboard (`/api/stats`:
  total/kinds/last activity). Added **GitHub Actions CI**
  (`.github/workflows/ci.yml`): validates compose + typecheck/lint/build the app
  on every PR. Decision D-0014. All green; routes + DELETE + stats smoke-tested.
- **2026-07-23** — Grew the app's **interactive layer** (PR #1): a **write box**
  (`MemoryComposer`) posting to `/api/memory`; a **`/brain`** browser with
  full-text **search** (`/api/memory?q=`); **auto-refresh** (`LiveRefresh`) on
  both pages so health + feed stay live. Added an **n8n starter workflow**
  (`n8n/log-to-brain.workflow.json`) that logs heartbeats into the brain. Build +
  typecheck + lint green; routes smoke-tested (`/`, `/brain`, `/brain?q=`,
  `/api/memory?q=` all 200).
- **2026-07-23** — Made the hub app **live** (PR #1): Postgres **shared brain**
  (`hub_memory`, schema in `app/db/schema.sql`) with `GET/POST /api/memory`;
  **server-side health probes** per active service (live status dots); optional
  **HTTP Basic Auth** gate (`HUB_BASIC_AUTH_*`, `/api/health` exempt). All
  degrades gracefully with no DB/services. **Verified**: build + typecheck +
  lint green, and a runtime smoke test (health ok, memory API graceful without
  DB, auth 401→200). Decision D-0013.
- **2026-07-23** — Built the **Next.js hub app** (PR #1) in `app/`: Next.js 15
  App Router + TS + Tailwind, service dashboard + `/api/health`, standalone
  Dockerfile. `next@15.5.21` (patches CVE-2025-66478). **Build + typecheck +
  lint verified green** in this session. Enabled the `hub-app` service in
  `docker-compose.yml` (builds `./app`, healthcheck on `/api/health`). Decision
  D-0012. Docs synced.
- **2026-07-23** — Expanded the stack (PR #1): added **n8n**, **Homepage**
  (config in `homepage/`), and a **restic** off-site backup service to
  `docker-compose.yml`; added a GPU-conditional (commented) **Ollama/Hermes**
  service. New env var names in `.env.example`. `scripts/bootstrap-vps.sh` for
  host setup. Component decisions recorded as **D-0005…D-0011**. Docs synced
  (`README`, `CONTEXT`, this file).
- **2026-07-23** — Established the hub foundation on branch
  `claude/multi-ai-workspace-hub-dprjrl`:
  - Core context docs: `README`, `PROJECT`, `AGENTS`, `CLAUDE`, `CONTEXT`,
    `HANDOFF`, `DECISIONS`.
  - Infra scaffold: `docker-compose.yml`, `.mcp.json`, `.env.example`,
    `.gitignore`.
  - `SETUP.md` — Coolify-on-Ubuntu install + stack import walkthrough.
  - `workspace/` shared-folder tree.

## Notes for the next agent

- The compose file uses **named volumes + a bind to `./workspace`**; in Coolify,
  map these to Persistent Storage so data survives redeploys.
- MCP: stdio connectors (github, filesystem, memory, postgres) are launched
  per-session via `.mcp.json`. Containerizing them is optional — see
  [`DECISIONS.md`](./DECISIONS.md#d-0003).
- Keep Coolify + code-server behind Tailscale/SSH. Do not expose publicly.

---

_Update this file at the end of every session._
