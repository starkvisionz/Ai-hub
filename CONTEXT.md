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
                        │  │  • n8n (automation backbone)    │ │
                        │  │  • Homepage (dashboard)         │ │
                        │  │  • restic-backup (off-site)     │ │
                        │  │  • MCP servers (connectors)     │ │
                        │  │  • Ollama/Hermes (GPU, off)     │ │
                        │  │  • hub app (Next.js, future)    │ │
                        │  └─────────────────────────────────┘ │
                        │  Shared volume: /workspace           │
                        └──────────────────────────────────────┘
        Access is gated behind Tailscale / SSH tunnel — never public.
        restic-backup ships encrypted snapshots off-site (B2 / S3).
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

## Service stack (see `docker-compose.yml`; rationale in `DECISIONS.md`)

| Service | Role | State |
|---------|------|-------|
| Coolify | Control panel (supervises Docker) | Host install |
| code-server | Browser IDE + terminal | Active |
| postgres/pgvector | Shared memory brain | Active |
| n8n | Automation: webhooks, schedules, agent triggers | Active |
| Homepage | YAML-config service dashboard (`./homepage/`) | Active |
| restic-backup | Off-site encrypted backups (B2/S3) | Active |
| Ollama / Hermes | Local LLM | **Off — GPU only** |
| Forgejo | Self-hosted Git forge | Deferred (Phase 2) |
| hub app | Next.js dashboard/API | Future |

## Environment assumptions

- **VPS OS:** Ubuntu (LTS). Adjust in [`SETUP.md`](./SETUP.md) if different.
- **VPS host:** stored as `VPS_HOST` in `.env` (git-ignored) — not committed, to
  avoid advertising the box publicly.
- **Control panel:** Coolify (self-hosted, Docker-based).
- **Access:** Tailscale (mesh VPN) in front of Coolify + code-server; Cloudflare
  Tunnel only for any deliberately public service.

## Open unknowns (fill in as decided)

- [ ] **Does the VPS have a GPU?** — decides whether Hermes/Ollama is enabled.
- [ ] VPS provider, region, and specs — _host IP known, kept in `.env`_
- [ ] Domain(s) for services — _TBD_
- [ ] Restic backend + off-site bucket (B2 vs S3) — _TBD_
- [ ] Which projects the hub coordinates first — _TBD, list under `workspace/repos/`_

---

_Last updated: 2026-07-23._
