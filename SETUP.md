# SETUP.md — Standing Up the AI Hub

How to go from a bare VPS to a running, Coolify-managed hub stack. Target OS is
**Ubuntu LTS** (22.04 / 24.04); notes for Debian are called out where relevant.

> **Security first:** the Coolify dashboard and code-server are powerful. Keep
> them behind **Tailscale** or an **SSH tunnel** — never exposed naked to the
> public internet. See [§Security](#security).

> **This hub's target: Hostinger KVM2** (≈2 vCPU / 8 GB RAM / ~100 GB NVMe,
> Ubuntu). Hostinger-specific shortcuts are called out in
> [§Hostinger notes](#hostinger-notes) — most importantly, you can install the
> VPS from Hostinger's **one-click Coolify template**, which skips step 3.

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

- **Coolify one-click template.** In hPanel → your VPS → **Operating System**
  (OS & panel), pick the **Coolify** template and (re)install. This provisions
  Ubuntu with Coolify already installed — **skip step 3**. Then just do the base
  hardening + Tailscale (steps 1–2) and go straight to importing the stack
  (step 4). Reinstalling wipes the disk, so do this before you have data.
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

- **Never expose Coolify (`:8000`) or code-server (`:8080`) on the public
  internet.** Bind to loopback (the compose file does) and reach them via
  Tailscale or `ssh -L 8080:localhost:8080 user@vps`.
- Keep the firewall to SSH-only; let Tailscale carry the rest.
- Secrets live in `.env` / Coolify env — **never** in Git. `.env` is git-ignored.
- Give the GitHub MCP token the **minimum** scope it needs.
- For any genuinely public service (e.g. a future marketing site), front it with
  Coolify's reverse proxy + TLS and put auth in front of anything sensitive.

## Appendix: Compose-only

You don't need Coolify to run the hub — it's a convenience layer. The stack is a
standard `docker-compose.yml`:

```bash
cp .env.example .env && $EDITOR .env
docker compose up -d
```

You lose the paneled UI, Git auto-deploy, and one-click TLS/backups, but the
services are identical. Add Coolify later and import the same file.

---

_Last updated: 2026-07-23._
