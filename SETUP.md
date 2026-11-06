# SETUP.md — Standing Up the AI Hub

How to go from a bare VPS to a running, Coolify-managed hub stack. Target OS is
**Ubuntu LTS** (22.04 / 24.04); notes for Debian are called out where relevant.

> **Security first:** the Coolify dashboard and code-server are powerful. Keep
> them behind **Tailscale** or an **SSH tunnel** — never exposed naked to the
> public internet. See [§Security](#security).

> **This hub's target: Hostinger KVM2** (≈2 vCPU / 8 GB RAM / ~100 GB NVMe,
> Ubuntu), deployed **Compose-only, no Coolify** — jump straight to
> [§Go live without Coolify](#go-live-without-coolify-compose-only--the-chosen-path).
> Steps 3–7 below describe the alternative Coolify-managed path, kept for
> reference; Hostinger specifics live in [§Hostinger notes](#hostinger-notes).

---

## 0. Prerequisites

- A VPS with **Ubuntu LTS**, ≥ 2 vCPU / 4 GB RAM (8 GB comfortable), ≥ 40 GB disk.
  (Hostinger KVM2 fits — see [§Hostinger notes](#hostinger-notes).)
- A domain (optional but recommended for TLS on public-facing app services).
- SSH access as a sudo-capable user (or Hostinger's hPanel **Browser terminal**).
- Locally: this repo, and the secret values for `.env` (see `.env.example`).

## 1. Base the server

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw
# Minimal firewall: SSH only. (We reach panels over Tailscale/SSH, not public ports.)
sudo ufw allow OpenSSH
sudo ufw enable
```

## 2. Install Tailscale (recommended access layer)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Now the VPS has a private Tailscale IP. You'll reach Coolify and code-server on
that IP, not the public one.

## 3. Install Coolify (installs Docker for you)

Coolify's installer sets up Docker + the Coolify control plane:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

When it finishes, open the dashboard at `http://<tailscale-ip>:8000` and create
the admin account. (Debian works too; the installer handles both.)

> **On Hostinger you can skip this step** by installing the VPS from the
> **Coolify template** — see [§Hostinger notes](#hostinger-notes).

> Prefer plain Docker without Coolify? Skip to [§Appendix: Compose-only](#appendix-compose-only).

## 4. Bring in this repo's stack

Two ways — pick one:

**A. Import via Coolify (recommended for the paneled workflow)**
1. In Coolify: **+ New → Resource → Docker Compose** (or connect this Git repo
   and point it at `docker-compose.yml`).
2. Paste/point to `docker-compose.yml` from this repo.
3. Set env vars (from `.env.example`) in Coolify's **Environment Variables** UI —
   `CODE_SERVER_PASSWORD`, `POSTGRES_PASSWORD`, etc. **Do not** commit these.
4. Under **Persistent Storage**, map:
   - `postgres-data` → a Coolify volume (survives redeploys)
   - `./workspace` → a Coolify Persistent Storage path (the shared filesystem)
5. Deploy. Each service appears as a tile you can start/stop/log/redeploy.

**B. Plain Docker Compose (no Coolify)**
```bash
git clone <this-repo-url> ai-hub && cd ai-hub
cp .env.example .env && $EDITOR .env      # fill in real secrets
docker compose config -q                  # validate
docker compose up -d
docker compose ps
```

## 5. First-run checks

```bash
docker compose ps                     # or the Coolify tiles
docker compose logs -f code-server    # confirm the IDE started
docker compose logs -f postgres       # confirm the DB is healthy
```

- **code-server:** reach it at `http://<tailscale-ip>:8080` (or Coolify's proxied
  URL). Log in with `CODE_SERVER_PASSWORD`.
- **Postgres brain:** connect with `DATABASE_URL` (see `.env.example`).

## 6. Wire up Claude Code (MCP connectors)

Inside code-server's terminal (or any Claude Code session on the host):

1. Ensure the env vars from `.env` are exported (`WORKSPACE_DIR`,
   `GITHUB_PERSONAL_ACCESS_TOKEN`, `DATABASE_URL`).
2. `.mcp.json` at the repo root auto-loads the shared connectors (filesystem,
   memory, github, postgres). Confirm with `/mcp` in a Claude Code session.
3. Clone the projects the hub coordinates into `workspace/repos/<project>/`.

## 7. Day-2: updates & redeploys

- **App/service change:** push to Git → Coolify auto-redeploys (if Git-connected),
  or `docker compose pull && docker compose up -d` for image bumps.
- **Automated deploys:** see [`DEPLOY.md`](./DEPLOY.md) — either Coolify-native
  auto-deploy, or the CI-gated `Deploy` workflow (deploys only after CI is green).
- **Backups:** enable Coolify's scheduled backups on the Postgres resource.
- **Logs:** Coolify tile → Logs, or `docker compose logs -f <service>`.

---

## Hostinger notes

This hub targets a **Hostinger KVM2** VPS. Hostinger-specific tips:

- **OS choice.** For the chosen **Compose-only** path, install plain
  **Ubuntu 24.04 LTS** in hPanel → your VPS → **Operating System**. (The
  one-click **Coolify** template exists there too — only pick it if you switch
  to the Coolify-managed path. Reinstalling wipes the disk either way, so do it
  before you have data.)
- **Browser terminal.** hPanel exposes a browser terminal for the VPS, so you can
  run `scripts/bootstrap-vps.sh` and the setup commands without a local SSH
  client.
- **Firewall.** Use hPanel's **Firewall** to allow only SSH (and Tailscale's UDP
  41641 if needed); do **not** open `8000`/`8080`/`5432` to the internet. This
  complements Tailscale — reach the panels over the tailnet, not public ports.
- **Sizing.** KVM2 is ~8 GB RAM. Coolify runs its own Postgres/Redis; watch total
  memory with the full stack up (see `CONTEXT.md` → resource budget). Keep
  Ollama/Hermes off (no GPU on KVM2).
- **Snapshots.** Hostinger offers VPS snapshots/backups in hPanel — a cheap safety
  net in addition to the Restic off-site backups this stack ships.

## Security

- **Never expose the services (`:3000`/`:5678`/`:8080`/`:5432` — or Coolify's
  `:8000` if you use it) on the public internet.** The compose file publishes on
  `BIND_ADDR` (default loopback; set it to the Tailscale IP for tailnet access),
  and `ufw` stays SSH-only so the public interface serves nothing else.
- Keep the firewall to SSH-only; let Tailscale carry the rest.
- Secrets live in `.env` (or Coolify env) — **never** in Git. `.env` is git-ignored.
- Give the GitHub MCP token the **minimum** scope it needs.
- For any genuinely public service (e.g. a future marketing site), front it with
  a reverse proxy + TLS (Caddy, or Coolify's proxy) and put auth in front of
  anything sensitive.

## Go live without Coolify (Compose-only) — the chosen path

You don't need Coolify — the stack is a standard `docker-compose.yml`, and this
is the deployment mode this hub uses (see `DECISIONS.md` D-0021).

**The one-command path** (fresh Ubuntu 24.04, hPanel Browser terminal or SSH):

```bash
curl -fsSL https://raw.githubusercontent.com/starkvisionz/Ai-hub/main/scripts/go-live.sh -o go-live.sh
sudo bash go-live.sh
```

[`scripts/go-live.sh`](./scripts/go-live.sh) does everything below in one shot —
base hardening, Docker, Tailscale (`tailscale up` pauses once for its login
URL), clone to `/opt/ai-hub`, **auto-generated secrets** in a fresh `.env`
(`BIND_ADDR` set to the Tailscale IP), build + start, health gate — then prints
your service URLs and the generated credentials. Idempotent; re-running keeps
the existing `.env`. Off-site backups stay opt-in: fill the `RESTIC_*` vars,
then `docker compose --profile backup up -d`.

**The manual steps**, if you'd rather drive each one:

```bash
# 0. In hPanel: install plain Ubuntu 24.04 LTS (NOT the Coolify template).
# 1. Host bootstrap — base hardening + Tailscale + Docker Engine:
sudo bash bootstrap-vps.sh --compose-only     # (fetch it from this repo first)
sudo tailscale up                              # authenticate the node
tailscale ip -4                                # note the 100.x.y.z address

# 2. Get the repo and configure:
sudo git clone https://github.com/starkvisionz/Ai-hub.git /opt/ai-hub
cd /opt/ai-hub
cp .env.example .env && nano .env
#    → fill the secrets (CODE_SERVER_PASSWORD, POSTGRES_PASSWORD,
#      N8N_ENCRYPTION_KEY, RESTIC_*, HUB_API_TOKEN, HUB_BASIC_AUTH_*…)
#    → set BIND_ADDR=<tailscale ip>  (services reachable tailnet-only)
#    → point SVC_*_URL at http://<tailscale ip>:<port> so dashboard links work

# 3. First deploy:
docker compose config -q && docker compose up -d --build
curl "http://$(tailscale ip -4):3000/api/health"    # {"status":"ok",...}

# 4. Updates (after each merge to main) — manual, cron, or n8n-triggered:
bash scripts/deploy-compose.sh
```

Service URLs once live (from any device on your tailnet):
hub app `:3000` · code-server `:8080` · n8n `:5678` · Homepage `:3001` ·
Postgres `:5432`.

What you give up vs. Coolify — the paneled UI, Git auto-deploy, one-click
TLS/backups — and what replaces each: the hub app + Homepage are the panels,
`scripts/deploy-compose.sh` (run manually or on a cron/n8n trigger) is the
deploy, restic is the backup. `restart: unless-stopped` + Docker's systemd unit
bring everything back after a reboot. The CI-gated Coolify workflow in
`DEPLOY.md` does not apply in this mode and stays dormant. You can still add
Coolify later and import the same compose file.

---

_Last updated: 2026-10-12._
