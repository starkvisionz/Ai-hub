#!/usr/bin/env bash
#
# bootstrap-vps.sh — stand up the AI Hub host from a fresh Ubuntu VPS.
#
# Run this ON THE VPS (via SSH or Hostinger's hPanel browser terminal), NOT from
# a dev sandbox. It contains NO secrets — you set those later in .env.
#
#   ssh <user>@<VPS_HOST>          # or open the hPanel Browser terminal
#   curl -fsSL <raw-url-to-this-file> -o bootstrap-vps.sh   # or scp it over
#   sudo bash bootstrap-vps.sh --compose-only    # plain Docker, no Coolify
#   sudo bash bootstrap-vps.sh                   # Coolify-managed variant
#
# What it does (idempotent where practical):
#   1. Update base packages + minimal firewall (SSH only)
#   2. Install Tailscale (you complete auth interactively)
#   3. --compose-only: install Docker Engine + Compose plugin
#      default:        install Coolify (which installs Docker)
# It intentionally stops short of deploying services — do that with
# `docker compose up -d --build` (see SETUP.md §Go live without Coolify) or in
# Coolify, after you've set real secrets in .env.

set -euo pipefail

MODE="coolify"
[ "${1:-}" = "--compose-only" ] && MODE="compose"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (or via sudo): sudo bash bootstrap-vps.sh [--compose-only]" >&2
  exit 1
fi

log "1/3  Base packages + firewall"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw ca-certificates
ufw allow OpenSSH
ufw --force enable
echo "Firewall: SSH-only. Reach services over Tailscale, not public ports."

log "2/3  Tailscale (private access layer)"
if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi
echo "Now run:  tailscale up   (opens a login URL to authenticate this node)"

if [ "$MODE" = "compose" ]; then
  log "3/3  Docker Engine + Compose plugin (no Coolify)"
  if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sh
  else
    echo "Docker already installed — skipping."
  fi
  systemctl enable --now docker
  docker compose version

  cat <<'NEXT'

──────────────────────────────────────────────────────────────────────────────
NEXT STEPS — Compose-only go-live (see SETUP.md §Go live without Coolify):
  1. tailscale up                       # join your tailnet; note this node's
     tailscale ip -4                    # 100.x.y.z address
  2. git clone <repo-url> /opt/ai-hub && cd /opt/ai-hub
  3. cp .env.example .env && nano .env  # fill secrets; set BIND_ADDR=<tailscale ip>
  4. docker compose config -q           # validate
     docker compose up -d --build       # first deploy (builds the hub app)
  5. Verify:  curl http://$(tailscale ip -4):3000/api/health
  6. Updates: bash scripts/deploy-compose.sh   (manual, cron, or n8n-triggered)

SECURITY: rotate any password ever shared in chat, switch SSH to key auth
  (PermitRootLogin prohibit-password), keep ufw at SSH-only, and never set
  BIND_ADDR to 0.0.0.0 or the public IP.
──────────────────────────────────────────────────────────────────────────────
NEXT
else
  log "3/3  Coolify (control panel — installs Docker)"
  if [[ ! -d /data/coolify ]]; then
    curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
  else
    echo "Coolify already present at /data/coolify — skipping install."
  fi

  cat <<'NEXT'

──────────────────────────────────────────────────────────────────────────────
NEXT STEPS (see SETUP.md for detail):
  1. Run:  tailscale up      # authenticate this node into your tailnet
  2. Open Coolify at  http://<tailscale-ip>:8000  and create the admin account.
  3. In Coolify: import this repo's docker-compose.yml as a resource.
  4. Set env vars from .env.example in Coolify (NEVER commit real secrets).
  5. Map Persistent Storage: postgres-data + ./workspace.
  6. Deploy. Then, in code-server's terminal, run Claude Code — .mcp.json wires
     the shared connectors automatically.

SECURITY: rotate any password you've shared in chat, switch to SSH keys, and set
  PermitRootLogin prohibit-password in /etc/ssh/sshd_config (then reload sshd).
──────────────────────────────────────────────────────────────────────────────
NEXT
fi
