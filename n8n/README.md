# n8n workflows

Importable n8n workflows for the hub. n8n is the automation backbone (see
`docker-compose.yml`); these connect it to the rest of the stack.

## Import

n8n → **Workflows → Import from File** → pick a `*.workflow.json` here. Review
node credentials/URLs, then activate.

## Networking note

Inside the Docker/Coolify network, services reach each other by **service name**,
not `localhost`. So n8n calls the hub app at `http://hub-app:3000`, Postgres at
`postgres:5432`, etc. The starter workflow already uses `http://hub-app:3000`.

## Auth note

If the hub app has `HUB_API_TOKEN` set (required when Basic Auth is enabled), the
brain API rejects unauthenticated writes. The workflows here send
`Authorization: Bearer {{ $env.HUB_API_TOKEN }}`, so set `HUB_API_TOKEN` in n8n's
environment (the same value as the app) and ensure n8n allows env access in
expressions (`N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, the default). When auth is off,
the header is harmless.

## Workflows

| File | What it does |
|------|--------------|
| [`log-to-brain.workflow.json`](./log-to-brain.workflow.json) | Every hour, POSTs a heartbeat entry into the shared brain (`hub-app` → `/api/memory`). Template for scheduled logging. |
| [`webhook-to-brain.workflow.json`](./webhook-to-brain.workflow.json) | Exposes an n8n webhook (`POST …/webhook/hub-brain`) that forwards `{ agent, kind, content }` into the brain. Point GitHub / monitoring / other webhooks at it to funnel external events into hub context. |

## Idea backlog

- GitHub webhook → summarize → write to brain (so sessions see repo activity).
- Nightly: snapshot open PRs / CI status into the brain.
- On restic backup completion → write a brain entry (success/size/duration).
