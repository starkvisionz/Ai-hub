# AI Hub app

The hub's web surface — a Next.js (App Router, TypeScript, Tailwind) dashboard
that tiles the running services and exposes a health endpoint. It's the "front
door" of the hub; deeper panels/APIs get added here over time.

## Develop

```bash
cd app
npm install
npm run dev        # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`,
`npm run typecheck`.

## Configuration

Service links default to loopback and are overridable via env (set these in
Coolify to point at your Tailscale hostname):

| Var | Default |
|-----|---------|
| `SVC_COOLIFY_URL` | `http://localhost:8000` |
| `SVC_CODE_SERVER_URL` | `http://localhost:8080` |
| `SVC_N8N_URL` | `http://localhost:5678` |
| `SVC_HOMEPAGE_URL` | `http://localhost:3001` |

## Routes

- `/` — service dashboard (server component, reads `src/lib/services.ts`).
- `/api/health` — JSON liveness probe (`{ status: "ok", ... }`).

## Deploy

Built as a standalone image via [`Dockerfile`](./Dockerfile) (`output:
"standalone"`). The root `docker-compose.yml` `hub-app` service builds this
directory; Coolify can auto-redeploy it from Git on push. Runs on port 3000
(loopback-bound; reach it via Tailscale / the Coolify proxy).
