"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AGENT_TYPES } from "@/lib/agentUi";

const PRESETS: { label: string; name: string; type: string; description: string }[] = [
  {
    label: "⚡ Claude Code",
    name: "claude-code",
    type: "claude-code",
    description: "Claude Code sessions driving this hub",
  },
  {
    label: "⌘ Codex",
    name: "codex",
    type: "codex",
    description: "Codex CLI runs",
  },
  {
    label: "✦ Hermes",
    name: "hermes",
    type: "hermes",
    description: "Local Hermes LLM (offline until a GPU host exists — D-0010)",
  },
];

// Register an agent from the UI — or one-click the three standard presets.
export function AgentRegisterForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("other");
  const [project, setProject] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register(payload: Record<string, string>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setName("");
        setProject("");
        setDescription("");
        setOpen(false);
        router.refresh();
      } else {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          b.error === "invalid_name"
            ? "Names: letters/digits, then letters, digits, . _ - (max 64)."
            : "Could not register (database connected?).",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            disabled={busy}
            onClick={() => register(p)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-400 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500"
            title={`Register ${p.name}`}
          >
            + {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500 hover:border-slate-400 dark:border-slate-600 dark:text-slate-400"
        >
          {open ? "× cancel" : "+ custom agent"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              void register({ name: name.trim(), type, project, description });
            }
          }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="agent name"
            className="w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-950"
          >
            {AGENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="project (optional)"
            className="w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="description (optional)"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
          >
            {busy ? "Registering…" : "Register"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
    </div>
  );
}
