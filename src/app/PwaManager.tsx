"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Registers the service worker and shows a small connectivity pill:
 *   - offline  → persistent "Offline — your work is saved on this device"
 *   - online   → transient  "Back online"
 *   - synced   → transient  "Synced ✓ N changes" (fired by the sync engine via
 *                the `nf:synced` window event once offline writes exist)
 * Mounted at the layout root so it runs on every route, including /login.
 */
type Toast =
  | { kind: "offline" }
  | { kind: "online" }
  | { kind: "synced"; count: number }
  | null;

export default function PwaManager() {
  const [toast, setToast] = useState<Toast>(null);
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

  // Connectivity + sync toasts.
  useEffect(() => {
    const clearHide = () => {
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
    const showTransient = (t: Toast) => {
      clearHide();
      setToast(t);
      hideTimer.current = window.setTimeout(() => setToast(null), 3400);
    };

    const goOffline = () => {
      clearHide();
      setToast({ kind: "offline" }); // stays until reconnect
    };
    const goOnline = () => showTransient({ kind: "online" });
    const onSynced = (e: Event) => {
      const count = (e as CustomEvent<{ count?: number }>).detail?.count ?? 0;
      showTransient({ kind: "synced", count });
    };

    if (!navigator.onLine) setToast({ kind: "offline" });

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    window.addEventListener("nf:synced", onSynced as EventListener);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("nf:synced", onSynced as EventListener);
      clearHide();
    };
  }, []);

  if (!toast) return null;

  const dot =
    toast.kind === "offline" ? "var(--warn)" : "var(--pos)";
  const label =
    toast.kind === "offline"
      ? "Offline — your work is saved on this device"
      : toast.kind === "online"
        ? "Back online"
        : toast.count > 0
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
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: dot }}
        />
        {label}
      </div>
    </div>
  );
}
