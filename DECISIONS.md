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

_Add the next decision above this line as `D-0005`._
