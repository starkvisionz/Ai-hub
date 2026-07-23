# CLAUDE.md — Claude Code Memory

> Auto-loaded by Claude Code. This is the Claude-specific layer on top of the
> shared [`AGENTS.md`](./AGENTS.md). Everything in `AGENTS.md` applies; this file
> adds Claude Code specifics. Keep it short — link, don't duplicate.

## Orientation (do this first)

Read in order: [`PROJECT.md`](./PROJECT.md) → [`AGENTS.md`](./AGENTS.md) →
[`CONTEXT.md`](./CONTEXT.md) → [`HANDOFF.md`](./HANDOFF.md). Then pick up the
next task from `HANDOFF.md`.

## What this repo is

The self-hosted **AI Hub**: shared context docs + a Coolify/Docker stack
(`docker-compose.yml`, `.mcp.json`, `SETUP.md`) that runs the always-on services
(code-server, Postgres brain, MCP connectors). You (Claude Code) are the
*driver*; Coolify supervises the *infrastructure*.

## Working here

- **Branch:** work on `claude/<topic>-<id>`; open a **draft PR** per branch;
  never push to `main` without explicit permission.
- **Secrets:** never commit them. Use `.env` (git-ignored); document names in
  `.env.example`.
- **Hand off:** before ending a session, update [`HANDOFF.md`](./HANDOFF.md) and,
  if you made a judgment call, [`DECISIONS.md`](./DECISIONS.md).
- **Keep docs true:** update the relevant doc in the same commit as the change.

## MCP connectors

`.mcp.json` (repo root) is the source of truth for connectors every session
should load. Prefer editing it over configuring connectors ad hoc.

## Commands you'll commonly run

```bash
# Bring the stack up locally (mirrors what Coolify runs)
docker compose up -d
docker compose ps
docker compose logs -f <service>

# Validate compose without starting
docker compose config -q
```

> When the hub grows an app (Next.js), add its dev/test/lint commands here so
> future sessions don't have to rediscover them.

## Guardrails specific to this environment

- Remote sessions run in ephemeral containers — **commit and push** anything
  worth keeping.
- Coolify's dashboard and code-server must stay behind Tailscale/SSH, never
  exposed naked to the internet (see [`SETUP.md`](./SETUP.md) §Security).

---

_Last updated: 2026-07-23._
