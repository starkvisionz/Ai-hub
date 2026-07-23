"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RemoveLinkButton({ linkId }: { linkId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/links?link_id=${linkId}`, { method: "DELETE" });
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
      aria-label="Remove link"
      title="Remove link"
      className="rounded px-1 text-slate-300 hover:text-rose-500 disabled:opacity-40 dark:text-slate-600 dark:hover:text-rose-400"
    >
      ×
    </button>
  );
}
