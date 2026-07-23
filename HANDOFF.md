# HANDOFF.md — Live State

> The running log. Fastest-changing file in the hub. Every session: read the top,
> do work, then update this before you leave. Newest entry on top.
> Durable facts live in [`CONTEXT.md`](./CONTEXT.md); rationale in
> [`DECISIONS.md`](./DECISIONS.md).

## Current status

**Phase 0 — Foundation.** Scaffolding the hub: context docs + Coolify/Docker
infra definition. Nothing is deployed yet; the compose stack is defined but not
running on a VPS.

## Next up (pick from here)

1. **Provision the VPS** and install Coolify — follow [`SETUP.md`](./SETUP.md).
2. **Fill the unknowns** in [`CONTEXT.md`](./CONTEXT.md) (provider, domains).
3. **Import `docker-compose.yml`** into Coolify as a resource; wire persistent
   storage to `workspace/`.
4. **Set real env vars** in Coolify (names in `.env.example`); never commit them.
5. **Decide the first project(s)** the hub coordinates → clone under
   `workspace/repos/`.
6. *(Later)* Scaffold the `hub app` (Next.js dashboard/API) and add its commands
   to [`CLAUDE.md`](./CLAUDE.md).

## In flight

- _Nothing currently in flight._

## Recently done

- **2026-07-23** — Established the hub foundation on branch
  `claude/multi-ai-workspace-hub-dprjrl`:
  - Core context docs: `README`, `PROJECT`, `AGENTS`, `CLAUDE`, `CONTEXT`,
    `HANDOFF`, `DECISIONS`.
  - Infra scaffold: `docker-compose.yml` (code-server, postgres/pgvector,
    memory MCP, optional hub app), `.mcp.json`, `.env.example`, `.gitignore`.
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
