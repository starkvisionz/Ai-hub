# PROJECT.md — AI Hub

> The "what and why." Keep this file focused on intent and scope. Operational
> state lives in [`HANDOFF.md`](./HANDOFF.md); rationale for choices lives in
> [`DECISIONS.md`](./DECISIONS.md).

## Vision

A durable, version-controlled **context and coordination layer** for the AI
agents that build and operate across the Starkvisionz ecosystem. One place where
mission, conventions, decisions, and live state are written down so that any
agent or human can pick up work with full context and no re-derivation.

## Problem

- AI sessions are stateless and ephemeral — context evaporates between them.
- Multiple agents/tools touch the same work with no shared memory.
- Decisions get made in chat and then lost, so they get re-litigated.
- Onboarding a new agent (or a human) means re-explaining everything.

## Goals

1. **Continuity** — any agent can resume work from `HANDOFF.md` alone.
2. **Consistency** — a single working agreement (`AGENTS.md`) all agents follow.
3. **Traceability** — every significant decision is logged with its reasoning.
4. **Low friction** — plain Markdown, no build step, no runtime required.

## Non-goals (for now)

- Not (yet) a deployed web application or chat UI.
- Not a secrets store — **no credentials, tokens, or keys live in this repo.**
- Not a task tracker replacement — link out to the real tracker if one exists.

## Scope

**In scope**
- The six core hub files and any supporting docs (`/docs`, templates, checklists).
- Conventions for how agents branch, commit, hand off, and log decisions.

**Out of scope (until explicitly added)**
- Application code, infrastructure, and deployment. When we add them, this file
  and `DECISIONS.md` get updated first.

## Status

**Phase 0 — Foundation.** Establishing the six core files and conventions.
See [`HANDOFF.md`](./HANDOFF.md) for the live task list.

## Stakeholders

- **Owner:** Eric Stark (ericstark100@gmail.com)
- **Org:** Starkvisionz
- **Primary agents:** Claude Code (see [`CLAUDE.md`](./CLAUDE.md)) and any other
  AI assistants that adopt [`AGENTS.md`](./AGENTS.md).

## Roadmap (living)

- [x] Phase 0: Core hub files + conventions
- [ ] Phase 1: Fill in real project inventory (what the hub coordinates)
- [ ] Phase 2: Templates & checklists (`/docs`) for common agent tasks
- [ ] Phase 3: Decide whether the hub grows an app surface (dashboard/API) —
      log the decision in `DECISIONS.md` if so.

---

_Last updated: 2026-07-23._
