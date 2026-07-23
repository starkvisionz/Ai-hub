// The hub's service catalog. Mirrors docker-compose.yml + homepage/services.yaml.
// URLs default to loopback and can be overridden per-environment via env vars
// (e.g. point them at your Tailscale hostname in Coolify). Read on the server.

export type ServiceState = "active" | "off" | "deferred" | "future";

export type HubService = {
  name: string;
  description: string;
  href?: string;
  state: ServiceState;
  group: "Infrastructure" | "Automation & AI";
};

const env = (key: string, fallback: string) => process.env[key] ?? fallback;

export const services: HubService[] = [
  {
    name: "Coolify",
    description: "Control panel — deploy, logs, env vars, TLS.",
    href: env("SVC_COOLIFY_URL", "http://localhost:8000"),
    state: "active",
    group: "Infrastructure",
  },
  {
    name: "code-server",
    description: "Browser IDE + terminal. Where you drive Claude Code.",
    href: env("SVC_CODE_SERVER_URL", "http://localhost:8080"),
    state: "active",
    group: "Infrastructure",
  },
  {
    name: "Postgres (brain)",
    description: "pgvector shared memory / embeddings store — port 5432.",
    state: "active",
    group: "Infrastructure",
  },
  {
    name: "Restic backups",
    description: "Scheduled, encrypted, off-site snapshots (B2 / S3).",
    state: "active",
    group: "Infrastructure",
  },
  {
    name: "n8n",
    description: "Automation — webhooks, schedules, agent triggers.",
    href: env("SVC_N8N_URL", "http://localhost:5678"),
    state: "active",
    group: "Automation & AI",
  },
  {
    name: "Homepage",
    description: "YAML-configured service dashboard.",
    href: env("SVC_HOMEPAGE_URL", "http://localhost:3001"),
    state: "active",
    group: "Automation & AI",
  },
  {
    name: "Hermes (Ollama)",
    description: "Local LLM — disabled (CPU-only KVM2 host, no GPU).",
    state: "off",
    group: "Automation & AI",
  },
  {
    name: "Forgejo",
    description: "Self-hosted Git forge — deferred to Phase 2.",
    state: "deferred",
    group: "Infrastructure",
  },
];
