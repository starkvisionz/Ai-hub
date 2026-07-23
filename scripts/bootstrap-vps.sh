#!/usr/bin/env bash
#
# bootstrap-vps.sh — stand up the AI Hub host from a fresh Ubuntu VPS.
#
# Run this ON THE VPS (via SSH or code-server terminal), NOT from a dev sandbox.
# It contains NO secrets — you set those later in .env / Coolify.
#
#   ssh <user>@<VPS_HOST>
#   curl -fsSL <raw-url-to-this-file> -o bootstrap-vps.sh   # or scp it over
#   bash bootstrap-vps.sh
#
# What it does (idempotent where practical):
#   1. Update base packages + minimal firewall (SSH only)
#   2. Install Tailscale (you complete auth interactively)
#   3. Install Coolify (which installs Docker)
# It intentionally stops short of deploying services — do that in Coolify or with
# `docker compose up -d`, after you've set real secrets. See SETUP.md.

set -euo pipefail

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (or via sudo): sudo bash bootstrap-vps.sh" >&2
  exit 1
fi

log "1/3  Base packages + firewall"
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw ca-certificates
ufw allow OpenSSH
ufw --force enable
echo "Firewall: SSH-only. Reach panels over Tailscale/SSH, not public ports."

log "2/3  Tailscale (private access layer)"
if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi
echo "Now run:  tailscale up   (opens a login URL to authenticate this node)"
echo "After that, reach Coolify/code-server on this node's Tailscale IP."

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
