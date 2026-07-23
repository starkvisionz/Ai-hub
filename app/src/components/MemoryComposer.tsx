"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Write box for the shared brain. POSTs to /api/memory and refreshes the feed.
export function MemoryComposer() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [agent, setAgent] = useState("");
  const [kind, setKind] = useState("note");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || status === "saving") return;
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content,
          agent: agent.trim() || undefined,
          kind: kind.trim() || undefined,
        }),
      });
      if (res.ok) {
        setContent("");
        setStatus("ok");
        router.refresh();
        setTimeout(() => setStatus("idle"), 1500);
      } else {
        const body = (await res.json().catch(() => ({}))) as {
          reason?: string;
          error?: string;
        };
        setError(
          body.reason === "db_not_configured"
            ? "No database connected (set DATABASE_URL)."
            : body.reason === "db_unreachable"
              ? "Brain database unreachable."
              : (body.error ?? "Could not save."),
        );
        setStatus("error");
      }
    } catch {
      setError("Network error.");
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add context to the shared brain…"
        rows={2}
        className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          placeholder="agent (e.g. claude)"
          className="w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
        />
        <input
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          placeholder="kind"
          className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
        />
        <button
          type="submit"
          disabled={!content.trim() || status === "saving"}
          className="ml-auto rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
        >
          {status === "saving" ? "Saving…" : status === "ok" ? "Saved ✓" : "Add"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
    </form>
  );
}
