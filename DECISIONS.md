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

_Add the next decision above this line as `D-0013`._
