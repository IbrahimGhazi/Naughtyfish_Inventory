"use client";

import { useEffect } from "react";
import { hydrate, flush } from "@/lib/offline/client";

/*
 * Invisible driver for the offline layer (mounted only for authenticated users).
 * On mount and on every reconnect it flushes any queued writes — which fires the
 * "Synced ✓" toast — then refreshes the cached reference data + ledgers.
 */
export default function OfflineSync() {
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      flush().finally(() => {
        if (!cancelled) hydrate();
      });
    };
    run();
    window.addEventListener("online", run);
    return () => {
      cancelled = true;
      window.removeEventListener("online", run);
    };
  }, []);

  return null;
}
