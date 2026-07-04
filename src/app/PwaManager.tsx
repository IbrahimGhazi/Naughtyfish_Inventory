"use client";

import { useEffect, useRef, useState } from "react";
import { useOnline } from "@/lib/offline/useOnline";

/*
 * Registers the service worker and shows a small connectivity pill:
 *   - offline  → persistent "Offline — your work is saved on this device"
 *   - online   → transient  "Back online"
 *   - synced   → transient  "Synced ✓ N changes" (fired by the sync engine via
 *                the `nf:synced` window event)
 * The persistent offline pill is DERIVED from useOnline (no setState); only the
 * transient toasts use state, and they're set inside event callbacks.
 * Mounted at the layout root so it runs on every route, including /login.
 */
type Transient = { kind: "online" } | { kind: "synced"; count: number } | null;

export default function PwaManager() {
  const online = useOnline();
  const [transient, setTransient] = useState<Transient>(null);
  const hideTimer = useRef<number | null>(null);

  // Register the SW after load so it never competes with first paint.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  // Transient toasts, driven entirely by events (setState only in callbacks).
  useEffect(() => {
    const clearHide = () => {
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
    const show = (t: Transient) => {
      clearHide();
      setTransient(t);
      hideTimer.current = window.setTimeout(() => setTransient(null), 3400);
    };
    const onOnline = () => show({ kind: "online" });
    const onSynced = (e: Event) =>
      show({ kind: "synced", count: (e as CustomEvent<{ count?: number }>).detail?.count ?? 0 });

    window.addEventListener("online", onOnline);
    window.addEventListener("nf:synced", onSynced as EventListener);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("nf:synced", onSynced as EventListener);
      clearHide();
    };
  }, []);

  // Transient wins; otherwise show the persistent offline pill when offline.
  const toast: { kind: "offline" | "online" | "synced"; count?: number } | null = transient
    ? transient
    : !online
      ? { kind: "offline" }
      : null;
  if (!toast) return null;

  const dot = toast.kind === "offline" ? "var(--warn)" : "var(--pos)";
  const label =
    toast.kind === "offline"
      ? "Offline — your work is saved on this device"
      : toast.kind === "online"
        ? "Back online"
        : (toast.count ?? 0) > 0
          ? `Synced ✓ ${toast.count} change${toast.count === 1 ? "" : "s"}`
          : "Synced ✓";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div
        className="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-pop"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
      >
        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />
        {label}
      </div>
    </div>
  );
}
