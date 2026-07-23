# AI Hub

A self-hosted **multi-AI workspace hub**: a durable context layer *plus* a
Coolify-managed service stack that the AI agents across the Starkvisionz
ecosystem plug into. It's the single place that says *what we're building, how we
work, where things stand* — and it runs the always-on services (browser IDE,
shared-memory DB, MCP connectors) that make multi-agent work coherent.

Two layers, one repo:

1. **Context layer** — a small set of Markdown files, version-controlled, read at
   the start of every AI session and updated at the end. This is durable memory
   that survives ephemeral sessions and containers.
2. **Infrastructure layer** — `docker-compose.yml` + `.mcp.json` + `SETUP.md`
   define a stack that **Coolify** supervises on a VPS: `code-server` (where you
   drive Claude Code), a Postgres/pgvector "brain," and MCP connectors.

## Why this exists

AI sessions are ephemeral and multiple agents touch the same work with no shared
memory. Without a durable, shared context layer, every session re-learns the same
facts and re-litigates the same decisions. This hub keeps the durable context
**in the repo, in version control**, and keeps the shared services **always on**.

## The context files

| File | Purpose | Read when… |
|------|---------|-----------|
| [`README.md`](./README.md) | This overview | You're new here |
| [`PROJECT.md`](./PROJECT.md) | Vision, goals, scope, status | You need the "what and why" |
| [`AGENTS.md`](./AGENTS.md) | Working agreement for **any** AI agent | You're an agent about to do work |
| [`CLAUDE.md`](./CLAUDE.md) | Claude Code–specific memory (auto-loaded) | You're Claude Code |
| [`CONTEXT.md`](./CONTEXT.md) | The shared brain: stable facts, topology, endpoints | You need how the pieces connect |
| [`HANDOFF.md`](./HANDOFF.md) | Live state: done / in-flight / next | You're picking up work |
| [`DECISIONS.md`](./DECISIONS.md) | Decision log (ADR-style) | You're changing/questioning a choice |

## The infrastructure

| File / dir | Role |
|------------|------|
| [`docker-compose.yml`](./docker-compose.yml) | The hub service stack: code-server, postgres/pgvector, **n8n**, **Homepage**, **restic** backups, + commented GPU-only Ollama/Hermes and future app. Runnable directly or importable by Coolify. |
| [`.mcp.json`](./.mcp.json) | Shared MCP connectors every Claude Code session auto-loads (filesystem, memory, github, postgres). |
| [`.env.example`](./.env.example) | Names of required env vars (no values). Copy to `.env` (git-ignored). |
| [`SETUP.md`](./SETUP.md) | Ubuntu VPS → Tailscale → Coolify → running stack, step by step. |
| [`scripts/bootstrap-vps.sh`](./scripts/bootstrap-vps.sh) | One-shot host bootstrap (base + Tailscale + Coolify). Run **on the VPS**. |
| [`homepage/`](./homepage/) | Homepage dashboard config (YAML) tiling the hub services. |
| [`app/`](./app/) | The hub web app — Next.js 15 (App Router, TS, Tailwind): live dashboard, shared-brain browser (`/brain`), and `/api/*` (health, memory, stats). Build verified. |
| [`n8n/`](./n8n/) | Importable n8n workflows (starter logs events into the shared brain). |
| [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) | CI: validates compose + typechecks/lints/builds the app on every PR. |
| [`workspace/`](./workspace/) | Shared filesystem mounted into services (`repos/`, `shared/`, `scratch/`). |

### Service stack at a glance

| Service | Role | State |
|---------|------|-------|
| Coolify | Control panel | host install |
| code-server | Browser IDE + terminal | active |
| postgres/pgvector | Shared memory brain | active |
| n8n | Automation backbone | active |
| Homepage | Service dashboard | active |
| restic-backup | Off-site encrypted backups | active |
| hub app | Next.js dashboard + `/api/health` | active (built from `app/`) |
| Ollama / Hermes | Local LLM | **off — GPU only** |
| Forgejo | Self-hosted Git forge | deferred |

## Quickstart

**Run the stack** (see [`SETUP.md`](./SETUP.md) for the full Coolify path):

```bash
cp .env.example .env && $EDITOR .env   # fill in real secrets (never commit .env)
docker compose config -q               # validate
docker compose up -d                   # start code-server + postgres
docker compose ps
```

**Start an AI session:** read `PROJECT.md` → `AGENTS.md` (+ `CLAUDE.md` if you're
Claude Code) → `CONTEXT.md` → `HANDOFF.md`, then pick up the next task.

**End an AI session:** update `HANDOFF.md`; log any judgment call in
`DECISIONS.md`; commit and push. The next agent starts warm.

## Conventions

- **Default branch:** `main`. **Working branches:** `claude/<topic>-<id>`; one
  draft PR per branch; never push to `main` without explicit permission.
- **Secrets:** never committed. `.env` is git-ignored; document names in
  `.env.example`.
- **Security:** keep Coolify + code-server behind Tailscale/SSH — never public.
- **Docs are true:** update the relevant doc in the same commit as the change.

---

_Maintained by the Starkvisionz AI Hub. Last structural update: 2026-07-23._
