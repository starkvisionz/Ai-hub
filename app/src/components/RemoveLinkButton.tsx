"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Two-step remove guard (auto-reverts after 4s), matching entry deletion.
export function RemoveLinkButton({ linkId }: { linkId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/links?link_id=${linkId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  function request() {
    if (!confirming) {
      setConfirming(true);
      timer.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    void remove();
  }

  return (
    <button
      type="button"
      onClick={request}
      disabled={busy}
      aria-label={confirming ? "Confirm remove link" : "Remove link"}
      title={confirming ? "Click again to remove" : "Remove link"}
      className={`rounded px-1 disabled:opacity-40 ${
        confirming
          ? "font-medium text-rose-500"
          : "text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400"
      }`}
    >
      {confirming ? "remove?" : "×"}
    </button>
  );
}
