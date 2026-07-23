"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Small inline delete control for a shared-brain entry.
export function DeleteEntryButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/memory?id=${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      aria-label="Delete entry"
      title="Delete entry"
      className="rounded px-1 text-slate-300 transition hover:text-rose-500 disabled:opacity-40 dark:text-slate-600 dark:hover:text-rose-400"
    >
      {busy ? "…" : "×"}
    </button>
  );
}
