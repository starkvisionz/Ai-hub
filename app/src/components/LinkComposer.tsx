"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RELATIONS = ["relates-to", "follows-up", "caused-by", "duplicates", "blocks"];

// Form to link the current entry to another entry by id, with a relation label.
export function LinkComposer({ fromId }: { fromId: number }) {
  const router = useRouter();
  const [toId, setToId] = useState("");
  const [rel, setRel] = useState(RELATIONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const to = Number(toId);
    if (!Number.isInteger(to) || to <= 0 || to === fromId || busy) {
      setError(to === fromId ? "Can't link an entry to itself." : "Enter a valid target id.");
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
        setToId("");
        router.refresh();
      } else {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error === "invalid_ids" ? "Invalid or duplicate link." : "Could not link.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
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
      <input
        value={toId}
        onChange={(e) => setToId(e.target.value)}
        inputMode="numeric"
        placeholder="entry id"
        className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-950"
      />
      <button
        type="submit"
        disabled={busy || !toId.trim()}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
      >
        {busy ? "Linking…" : "Link"}
      </button>
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </form>
  );
}
