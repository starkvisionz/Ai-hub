"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Two-step unregister guard (matches the brain's delete UX). Runs are kept.
export function AgentDeleteButton({ name }: { name: string }) {
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
      const res = await fetch(`/api/agents?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (res.ok) router.push("/agents");
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
      className={`rounded-lg border px-2.5 py-1 text-xs transition disabled:opacity-40 ${
        confirming
          ? "border-rose-400 font-medium text-rose-500"
          : "border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-500 dark:border-slate-700"
      }`}
      title={confirming ? "Click again to unregister (runs are kept)" : "Unregister agent"}
    >
      {confirming ? "unregister?" : "unregister"}
    </button>
  );
}
