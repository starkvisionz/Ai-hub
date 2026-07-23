# CONTEXT.md — The Shared Brain

> Stable, slow-changing facts every agent needs: who, what, where, and how the
> pieces connect. Fast-changing "what's happening now" lives in
> [`HANDOFF.md`](./HANDOFF.md). If a fact here changes, update it here.

## Who

- **Owner / operator:** Eric Stark — ericstark100@gmail.com
- **Org:** Starkvisionz
- **Agents in the loop:** Claude Code (primary driver), plus any AI assistants
  that adopt [`AGENTS.md`](./AGENTS.md) (e.g. ChatGPT, IDE assistants).

## What we're building

A self-hosted multi-AI workspace hub. Two layers:

1. **Context layer** (this repo's Markdown) — durable memory across sessions.
2. **Infrastructure layer** — a Coolify-managed Docker stack on a VPS running the
   always-on services the agents plug into.

## Topology (target state)

```
                        ┌─────────────────────────────────────┐
   You (browser/SSH) ──▶│  VPS (Ubuntu)                        │
                        │                                      │
                        │  ┌────────────┐   Coolify (control) │
                        │  │  Coolify   │   supervises Docker  │
                        │  └─────┬──────┘                      │
                        │        │ manages                     │
                        │  ┌─────▼───────────────────────────┐ │
                        │  │ Docker services:                │ │
                        │  │  • code-server (IDE + terminal) │ │
                        │  │  • postgres/pgvector (brain DB) │ │
                        │  │  • MCP servers (connectors)     │ │
                        │  │  • hub app (Next.js, future)    │ │
                        │  └─────────────────────────────────┘ │
                        │  Shared volume: /workspace           │
                        └──────────────────────────────────────┘
        Access is gated behind Tailscale / SSH tunnel — never public.
```

## Where things live

| Thing | Location |
|-------|----------|
| Shared context docs | this repo root (`*.md`) |
| Infra definition | `docker-compose.yml`, `.mcp.json`, `SETUP.md` |
| Shared filesystem | `workspace/` (mounted into services as Coolify Persistent Storage) |
| Cloned project repos | `workspace/repos/<project>/` |
| Shared brain (memory/vectors) | Postgres `pgvector` service + memory MCP |
| Secrets | `.env` on the host (**git-ignored**); names documented in `.env.example` |

## The shared brain

Different AI sessions stay coordinated two ways:

1. **Git** — this repo is the durable, reviewable context. Every session reads
   it on start and updates `HANDOFF.md` on exit.
2. **Memory MCP + Postgres** — a running memory service so sessions can read/write
   accumulated context (facts, embeddings) beyond what's in Git.

## Environment assumptions

- **VPS OS:** Ubuntu (LTS). Adjust in [`SETUP.md`](./SETUP.md) if different.
- **Control panel:** Coolify (self-hosted, Docker-based).
- **Access:** Tailscale or SSH tunnel in front of Coolify + code-server.

## Open unknowns (fill in as decided)

- [ ] VPS provider, region, and specs — _TBD_
- [ ] Domain(s) for services — _TBD_
- [ ] Which MCP connectors are containerized (remote) vs. per-session (stdio) — _see `.mcp.json`_
- [ ] Which projects the hub coordinates first — _TBD, list under `workspace/repos/`_

---

_Last updated: 2026-07-23._
