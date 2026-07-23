# AGENTS.md — Working Agreement for AI Agents

> This file is the **shared operating contract** for *any* AI agent working in
> this hub — Claude Code, ChatGPT, IDE assistants, or automated workflows.
> Claude Code also reads [`CLAUDE.md`](./CLAUDE.md); the two are consistent by
> design. If you only read one file before working, read this one.

## 1. What this repo is

The **AI Hub**: a self-hosted, multi-AI **workspace + coordination layer**. It
holds (a) durable shared context in Markdown and (b) the infrastructure
definition (`docker-compose.yml`, `.mcp.json`, `SETUP.md`) for a Coolify-managed
stack of long-running services. See [`PROJECT.md`](./PROJECT.md) for the vision.

## 2. Read order before doing work

1. [`PROJECT.md`](./PROJECT.md) — mission & scope
2. This file (`AGENTS.md`) — how we work
3. [`CONTEXT.md`](./CONTEXT.md) — the shared brain: stable facts, topology, endpoints
4. [`HANDOFF.md`](./HANDOFF.md) — live state & the next task
5. [`DECISIONS.md`](./DECISIONS.md) — why things are the way they are

## 3. Golden rules

- **Never commit secrets.** No tokens, keys, passwords, connection strings with
  credentials, or private hostnames. Use `.env` (git-ignored) and reference vars
  by name. `.env.example` documents *names only*.
- **Leave the campsite warm.** End every work session by updating
  [`HANDOFF.md`](./HANDOFF.md). If you made a non-obvious call, log it in
  [`DECISIONS.md`](./DECISIONS.md).
- **Docs must stay true.** A stale hub misleads. If you change how something
  works, update the doc in the same commit.
- **Small, reversible steps.** Prefer draft PRs and incremental commits over big
  bang changes. Confirm before anything hard to reverse (deploys, deletes,
  destructive migrations).
- **Ask when it's the user's call.** Architecture forks, spend, and anything
  outward-facing → surface it, don't guess.

## 4. Git & branch conventions

- **Default branch:** `main`.
- **Working branches:** `claude/<topic>-<id>` (agents) or `<name>/<topic>` (humans).
- **Commits:** imperative mood, scoped, explain *why* when non-obvious.
- **PRs:** open as **draft**; one branch → one PR. Fill the template if present.
- Never push to `main` or someone else's branch without explicit permission.

## 5. The stack (what the agents plug into)

| Service | Role | Managed by |
|---------|------|-----------|
| **code-server** | Browser IDE + terminal where humans drive Claude Code | Coolify |
| **postgres (pgvector)** | Shared memory / vector store — the "brain" DB | Coolify |
| **MCP servers** | Tool connectors (github, filesystem, memory, postgres) | `.mcp.json` (per session) + optional containers |
| **hub app** *(future)* | Next.js dashboard / API surface | Coolify |

- **Shared storage:** the `workspace/` tree is the common filesystem all agents
  and services mount (Coolify "Persistent Storage"). Cloned project repos live
  under `workspace/repos/`.
- **Shared brain:** the Postgres/memory MCP so different AI sessions read the
  same accumulated context. See [`CONTEXT.md`](./CONTEXT.md).

## 6. MCP connectors

`.mcp.json` at the repo root defines the connectors every Claude Code session in
this hub should auto-load. Add a connector there (not ad hoc) so every session
gets the same tools. Secrets for connectors come from the environment, never the
file.

## 7. Definition of done for a task

- [ ] Change works and is verified (say how; if you couldn't verify, say that).
- [ ] Docs touched by the change are updated in the same PR.
- [ ] `HANDOFF.md` reflects new state; `DECISIONS.md` updated if a call was made.
- [ ] No secrets added. `.env.example` updated if new vars were introduced.
- [ ] Draft PR opened/updated.

---

_Last updated: 2026-07-23._
