"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Periodically re-renders the current (dynamic) route so health probes and the
// brain feed stay fresh without a manual reload. Pauses when the tab is hidden.
export function LiveRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
