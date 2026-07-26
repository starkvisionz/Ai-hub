"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MemoryEntry } from "@/lib/memory";

const RELATIONS = ["relates-to", "follows-up", "caused-by", "duplicates", "blocks"];

const snippet = (s: string) =>
  s.replace(/\s+/g, " ").trim().slice(0, 64) + (s.length > 64 ? "…" : "");

// Link the current entry to another. Targets are found via type-ahead search
// (ranked /api/memory?q=) — no need to know entry ids. Typing "#123" or a bare
// number still targets that id directly.
export function LinkComposer({ fromId }: { fromId: number }) {
  const router = useRouter();
  const [rel, setRel] = useState(RELATIONS[0]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MemoryEntry[]>([]);
  const [selected, setSelected] = useState<MemoryEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced candidate search while nothing is selected.
  useEffect(() => {
    const term = q.trim();
    if (!term || selected) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/memory?q=${encodeURIComponent(term)}&limit=8`,
        );
        const body = (await res.json()) as { entries?: MemoryEntry[] };
        setResults((body.entries ?? []).filter((e) => e.id !== fromId));
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, fromId, selected]);

  function targetId(): number | null {
    if (selected) return selected.id;
    const m = q.trim().match(/^#?(\d+)$/);
    return m ? Number(m[1]) : null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const to = targetId();
    if (busy) return;
    if (to === null || to === fromId) {
      setError(
        to === fromId
          ? "Can't link an entry to itself."
          : "Pick a target entry from the search results.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ from_id: fromId, to_id: to, rel }),
      });
      if (res.ok) {
        setQ("");
        setSelected(null);
        setResults([]);
        router.refresh();
      } else {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error === "invalid_ids" ? "Invalid link target." : "Could not link.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={rel}
          onChange={(e) => setRel(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-950"
        >
          {RELATIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {selected ? (
          <span className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-950">
            <span className="shrink-0 font-mono text-xs text-slate-400">
              #{selected.id}
            </span>
            <span className="truncate">{snippet(selected.content)}</span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Clear selection"
              className="ml-auto shrink-0 px-1 text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </span>
        ) : (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search entries to link (or #id)…"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
          />
        )}

        <button
          type="submit"
          disabled={busy || targetId() === null}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
        >
          {busy ? "Linking…" : "Link"}
        </button>
      </div>

      {!selected && results.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelected(r)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="shrink-0 font-mono text-xs text-slate-400">
                  #{r.id}
                </span>
                <span className="truncate">{snippet(r.content)}</span>
                <span className="ml-auto shrink-0 text-xs text-slate-400">
                  {r.agent}/{r.kind}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
    </form>
  );
}
