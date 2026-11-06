import type { Presence } from "./agents";

// Shared visual vocabulary for the command center. Brand-neutral hues, one per
// agent type; presence and run status get consistent colors everywhere.
// NOTE: client-safe — only type-imports from lib/agents (which pulls in pg).

export const AGENT_TYPES = ["claude-code", "codex", "hermes", "n8n", "other"];

export const typeBadge: Record<string, string> = {
  "claude-code":
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  codex: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  hermes:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300",
  n8n: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  other: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export const typeAccent: Record<string, string> = {
  "claude-code": "border-l-amber-400",
  codex: "border-l-sky-400",
  hermes: "border-l-violet-400",
  n8n: "border-l-emerald-400",
  other: "border-l-slate-300 dark:border-l-slate-600",
};

export const presenceMeta: Record<
  Presence,
  { label: string; dot: string; pulse: boolean }
> = {
  online: { label: "online", dot: "bg-emerald-500", pulse: true },
  idle: { label: "idle", dot: "bg-amber-400", pulse: false },
  offline: { label: "offline", dot: "bg-slate-400 dark:bg-slate-600", pulse: false },
};

export const runStatusChip: Record<string, string> = {
  running:
    "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 animate-pulse",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  failed: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
};

export const badgeFor = (type: string) => typeBadge[type] ?? typeBadge.other;
export const accentFor = (type: string) => typeAccent[type] ?? typeAccent.other;
