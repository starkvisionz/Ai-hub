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
8. **Grow the hub app** (`app/`): wire it to the Postgres brain (it already
   receives `DATABASE_URL`), add live service health tiles, and an auth gate.
9. *(Later)* Forgejo, if Git sovereignty is wanted.

## Verify locally

```bash
cd app && npm install && npm run build   # green as of 2026-07-23
docker compose config -q                 # stack validates
```

## In flight

- _Nothing currently in flight._

## Recently done

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
