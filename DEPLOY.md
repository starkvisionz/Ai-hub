# DEPLOY.md — Deploying the AI Hub

Once the stack is set up on the VPS (see [`SETUP.md`](./SETUP.md)), you want
changes on `main` to reach the running hub automatically. There are two paths —
pick one. They're not mutually exclusive, but running both just double-deploys.

| | **A. Coolify-native** (recommended) | **B. CI-triggered** (this repo's workflow) |
|---|---|---|
| How | Connect the repo in Coolify; it deploys on push | GitHub Actions calls Coolify's deploy API after CI passes |
| Gated on CI green? | No (deploys on any push) | **Yes** — only after all CI jobs pass on `main` |
| Needs inbound to Coolify | No | Yes (runner reaches Coolify over Tailscale) |
| Setup effort | Lowest | Moderate (a few secrets) |

Use **A** for simplicity; use **B** when you want "green tests → then deploy".

---

## A. Coolify-native auto-deploy

1. In Coolify, create the resource from this Git repo (Compose or per-service).
2. Under the resource's **Source / Git** settings, connect GitHub (Coolify's
   GitHub App) and enable **auto-deploy on push** for branch `main`.
3. Done — every push to `main` rebuilds. No secrets in this repo, nothing inbound
   to Coolify.

> Caveat: this deploys on *every* push, including ones where CI would fail. If
> that matters, use path B instead.

---

## B. CI-triggered deploy (`.github/workflows/deploy.yml`)

The `Deploy` workflow runs **after** the `CI` workflow completes successfully on
`main` (via `workflow_run`), or on demand (**Actions → Deploy → Run workflow**).
It joins your tailnet (Coolify is Tailscale-private) and calls Coolify's deploy
API via [`scripts/deploy.sh`](./scripts/deploy.sh).

**It safely no-ops until you configure the secrets below** — so merging this
changes nothing until you opt in.

### Required GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | What it is | Where to get it |
|--------|-----------|-----------------|
| `COOLIFY_URL` | Coolify base URL, no trailing slash (e.g. `http://100.x.y.z:8000` — its **Tailscale** IP) | Coolify dashboard address |
| `COOLIFY_TOKEN` | Coolify API token | Coolify → **Keys & Tokens → API tokens** (give it deploy scope) |
| `COOLIFY_RESOURCE_UUIDS` | Resource UUID(s), comma-separated — one for a single Compose resource, or several for separate services | The `.../resource/<uuid>` part of the resource URL |
| `TS_AUTHKEY` | Tailscale auth key so the runner can reach private Coolify | Tailscale admin → **Settings → Keys** — make it **ephemeral**, **pre-approved**, and **tagged** (e.g. `tag:ci`) |

If Coolify is reachable without Tailscale (not recommended), omit `TS_AUTHKEY`
and the tailnet step is skipped.

### How it flows

```
push to main ─▶ CI (compose · build · db-e2e · http-e2e)
                     │ success
                     ▼
              Deploy workflow ─▶ [Tailscale up] ─▶ scripts/deploy.sh
                                                     └▶ POST Coolify /api/v1/deploy?uuid=…
                                                          └▶ Coolify builds & rolls out
```

### Manual / local deploy

`scripts/deploy.sh` is standalone. From anywhere on the tailnet:

```bash
export COOLIFY_URL="http://<coolify-tailscale-ip>:8000"
export COOLIFY_TOKEN="…"
export COOLIFY_RESOURCE_UUIDS="<uuid>[,<uuid>…]"
# export COOLIFY_FORCE=true   # optional: ignore build cache
bash scripts/deploy.sh
```

## Security notes

- Secrets live only in **GitHub Actions secrets** — never in the repo or `.env`.
- Make the Tailscale auth key **ephemeral + tagged + pre-approved**, so a leaked
  key grants a short-lived, ACL-restricted node, not standing access.
- Scope the Coolify API token to what deploy needs.
- The runner reaches Coolify over Tailscale — Coolify stays off the public net.

## Rollback

Coolify keeps deployment history per resource — roll back from its UI
(**Deployments → pick a previous successful deploy → Redeploy**). The off-site
Restic backups (see `docker-compose.yml`) cover data, not code.
