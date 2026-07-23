# DECISIONS.md — Decision Log

> Lightweight ADRs. One entry per significant choice. Never delete an entry —
> supersede it with a new one so the history stays intact. Newest on top.

**Format**
```
## D-NNNN — <title>   (YYYY-MM-DD, status: accepted | superseded | proposed)
Context:  what forced a decision
Decision: what we chose
Why:      the reasoning / alternatives rejected
```

---

## D-0017 — Ranked full-text search (with substring fallback) + link counts   (2026-07-23, status: accepted)
**Context:** Search was substring-only (unranked); list rows gave no sense of an
entry's connectivity.
**Decision:** Add a generated `search tsvector` column (content+agent+kind) with a
GIN index; search now matches `websearch_to_tsquery` OR substring ILIKE, ordered
by pinned, then `ts_rank`, then recency. List queries also return a `link_count`
(in+out relations), shown as a badge on `/brain` rows.
**Why:** Real relevance ranking and stemming while keeping partial-word matches;
connectivity is visible at a glance. Generated column needs PG12+ (we target
pg16). Verified E2E against local Postgres 16 (stemmed + substring + link_count).

## D-0016 — Relations: a lightweight knowledge graph over the brain   (2026-07-23, status: accepted)
**Context:** Entries were isolated; agents want to connect related context
(follow-ups, causes, duplicates).
**Decision:** Add a `hub_links` table (directed, labelled edges with
`ON DELETE CASCADE`, `UNIQUE(from_id,to_id,rel)`, `CHECK(from_id<>to_id)`),
`/api/links` (GET/POST/DELETE), and a `/brain/[id]` detail page to view/add/remove
links. Relations are surfaced bidirectionally (in/out).
**Why:** Turns the flat log into a small graph without heavy graph infra; FK
cascade keeps it consistent when entries are deleted. Verified E2E against local
Postgres (link create/list/delete + cascade) and via HTTP smoke test.

## D-0015 — Live-DB E2E test in CI; parse int8 ids as numbers   (2026-07-23, status: accepted)
**Context:** All brain DB paths had only been exercised against the graceful
no-DB branches (no Docker in the dev sandbox). Running the real code against a
local Postgres surfaced a bug: `pg` returns BIGSERIAL ids as **strings**, so the
`Number.isInteger(id)` guards in `editMemory`/`deleteMemory` rejected them —
edit, delete, and pin were silently no-ops.
**Decision:** (1) In `db.ts`, register an int8 (OID 20) type parser → JS number,
aligning runtime with the `number` type. (2) Add `app/test/brain.e2e.ts`
(exercises the real `memory.ts` functions) + a `test:db` script, and a CI job
`db-e2e` that runs it against a Postgres service on every PR.
**Why:** Closes the one verification gap; the test caught a real regression on
first run and now guards against similar ones. int8→number is safe (ids fit well
within `Number.MAX_SAFE_INTEGER`).

## D-0014 — CI on GitHub Actions: validate compose + typecheck/lint/build the app   (2026-07-23, status: accepted)
**Context:** The repo now has real code (compose stack + Next.js app) that can
break silently on a PR.
**Decision:** Add `.github/workflows/ci.yml` with two jobs — `compose`
(`docker compose config -q` with dummy required-var values) and `app`
(`npm ci` → typecheck → lint → build on Node 22). Runs on PRs and pushes to main.
**Why:** Cheap, fast guardrail that keeps every PR green without manual checks.
Dummy env only satisfies `${VAR:?}` checks; no secrets involved.

## D-0013 — Shared brain via Postgres `hub_memory` + graceful degradation + optional Basic Auth   (2026-07-23, status: accepted)
**Context:** The hub app needs to read/write shared context and show live service
state, without hard-failing when the DB or services are down.
**Decision:** Add a `hub_memory` table (app-managed schema) exposed via
`GET/POST /api/memory`; probe active services server-side for live health; gate
the app behind optional HTTP Basic Auth (`HUB_BASIC_AUTH_*`, `/api/health` exempt).
**Why:** Gives agents/n8n a simple HTTP surface to coordinate through, and makes
the dashboard genuinely live. Graceful degradation (null-on-failure DB layer,
timed health probes) keeps the app up during partial outages. Basic Auth is a
cheap second layer behind Tailscale. All paths verified green (build + runtime
smoke test: DB-absent, memory API, and 401/200 auth).

## D-0012 — Hub app: Next.js 15 App Router + TypeScript + Tailwind   (2026-07-23, status: accepted)
**Context:** The hub needs a web surface (dashboard/API) as its front door.
**Decision:** Build it in **Next.js 15 (App Router) + TypeScript + Tailwind v3**,
in `app/`, emitted as a **standalone** Docker image and wired into compose as
`hub-app`. Pinned `next@15.5.21` (patches CVE-2025-66478).
**Why:** App Router + standalone output gives a tiny, Coolify-friendly image with
Git auto-deploy; TS + Tailwind are the team-standard, low-friction stack. Tailwind
v3 (not v4) for a well-trodden, reliable build. Build verified green here.
**Note:** Two transitive advisories remain in Next's optional `sharp`/`postcss`
deps; `audit fix --force` would downgrade Next to 9.3.3 (breaking), so left as-is.
`sharp` is only used by `next/image` optimization, which this app doesn't use.

## D-0011 — Nextcloud not adopted; use workspace volume + MinIO if needed   (2026-07-23, status: accepted)
**Context:** Nextcloud was floated for shared files.
**Decision:** Skip Nextcloud. Use the shared `workspace/` volume for agent/human
files; add **MinIO** later only if the app needs S3-style object storage.
**Why:** Nextcloud is heavy (PHP + own DB + cron) and overlaps the workspace
volume. Revisit only if human-facing file sync / Office collab becomes a need.

## D-0010 — Local LLM "Hermes" via Ollama is GPU-conditional, deferred   (2026-07-23, status: accepted)
**Context:** A private local model (Hermes) alongside Claude was requested.
**Decision:** Define an Ollama service in compose but leave it **commented/off**;
enable only on a GPU host. Claude remains the primary model.
**Why:** CPU inference is too slow to be useful. Avoids committing the hub to
GPU costs before there's hardware. Trivial to enable when a GPU is available.
**Update (2026-07-23):** Host confirmed as **KVM2 (CPU-only, no GPU)** → Ollama
stays disabled. Also a RAM-budget concern on ~8 GB; keeping it off protects that.

## D-0009 — Forgejo deferred to Phase 2 (conditional)   (2026-07-23, status: accepted)
**Context:** A self-hosted Git forge was considered.
**Decision:** Stay on GitHub for now; add **Forgejo** later if/when we want code
sovereignty, private mirrors, local CI (Forgejo Actions), and webhooks into n8n.
**Why:** Real maintenance cost with no immediate need. GitHub already covers the
workflow. Keep it on the roadmap, not the critical path.

## D-0008 — Tailscale is the private access layer; Cloudflare Tunnel for public   (2026-07-23, status: accepted)
**Context:** Admin panels (Coolify, code-server) must not be public; some future
services may need controlled public exposure.
**Decision:** **Tailscale** (mesh VPN + MagicDNS + ACLs) for all private/admin
access. Add **Cloudflare Tunnel** only for specific public-facing services, with
auth in front.
**Why:** Tailscale is the simplest secure-by-default reach for admin surfaces and
needs no open ports; Cloudflare Tunnel cleanly exposes only what must be public.

## D-0007 — Restic for off-site, encrypted, scheduled backups   (2026-07-23, status: accepted)
**Context:** The Postgres brain + workspace need durable backups; Coolify's DB
backups are on-box only.
**Decision:** Run a **Restic** backup container on a cron schedule to an off-site
repo (Backblaze B2 / S3), covering `postgres-data` + `workspace/`.
**Why:** Encrypted, deduplicated, off-site, and provider-agnostic. Complements
(doesn't replace) Coolify backups. Retention pruning configured via env.

## D-0006 — Homepage (not Homarr) for the dashboard   (2026-07-23, status: accepted)
**Context:** Need a single start page tiling all hub services.
**Decision:** Use **Homepage** (gethomepage), config in `./homepage/*.yaml`.
**Why:** YAML config is version-controllable and matches our docs-as-code ethos;
lightweight and Docker-aware. Homarr is prettier but DB-backed/drag-and-drop, so
its config drifts out of Git.

## D-0005 — n8n as the automation backbone   (2026-07-23, status: accepted)
**Context:** The hub needs always-on automation: webhooks, schedules, and glue
between GitHub/agents/services.
**Decision:** Adopt **n8n** as a first-class hub service (own volume; can switch
to Postgres later).
**Why:** Highest-leverage automation layer for a multi-AI hub — turns events into
agent/service actions without bespoke scripts. Self-hosted, extensible.

## D-0004 — Ubuntu as the default VPS OS   (2026-07-23, status: accepted)
**Context:** The stack needs a host OS; the owner flagged Ubuntu as the smooth
default for Coolify.
**Decision:** Target **Ubuntu LTS** in `SETUP.md`.
**Why:** Coolify's install script and docs are best-tested on Ubuntu; largest
community + fewest surprises. Trivial to adapt to Debian; documented as such.

## D-0003 — MCP connectors default to per-session (stdio), not containers   (2026-07-23, status: accepted)
**Context:** The vision imagined MCP servers as always-on containers Coolify
supervises. Most Claude Code MCP servers are stdio processes the client launches.
**Decision:** Define connectors in `.mcp.json` (per-session, stdio) as the
default. Containerize only MCP servers that genuinely need to be long-running,
remote (HTTP/SSE), or shared across non–Claude-Code clients.
**Why:** stdio connectors are simpler, need no networking/TLS, and match how
Claude Code actually loads tools. Keeps the always-on surface (and attack
surface) small. Revisit per-connector if a remote server is required.

## D-0002 — Coolify as the control panel (over plain Docker Compose)   (2026-07-23, status: accepted)
**Context:** The hub needs a "paneled control center": deploys, logs, env vars,
TLS, one-click services — from a browser.
**Decision:** Use **Coolify** (self-hosted, on Docker) as the control plane; keep
a plain `docker-compose.yml` that Coolify imports so the stack is also runnable
without it.
**Why:** Coolify delivers the dashboard/Git-auto-deploy/TLS/DB-backups the owner
described, without hand-writing systemd/nginx. Keeping a portable compose file
avoids lock-in — the stack runs with or without Coolify.
**Security note:** Coolify's dashboard is powerful → keep it behind Tailscale/SSH.

## D-0001 — Docs-first, version-controlled context layer   (2026-07-23, status: accepted)
**Context:** AI sessions are ephemeral; context is repeatedly lost and decisions
re-litigated.
**Decision:** Make plain-Markdown, version-controlled files the durable context
layer (`PROJECT`, `AGENTS`, `CLAUDE`, `CONTEXT`, `HANDOFF`, `DECISIONS`), read at
session start and updated at session end.
**Why:** Zero runtime, reviewable via PRs, portable across any AI tool, and
survives container/session churn. The infra layer is defined in the same repo so
docs and reality stay together.

---

_Add the next decision above this line as `D-0018`._
