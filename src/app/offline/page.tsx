"use client";

import { useEffect, useState } from "react";

// Shown by the service worker only when a page that was never cached is opened
// with no connection. Pages already visited this session are served from cache
// instead. Auto-reloads the moment the connection returns.
export default function OfflinePage() {
  const [back, setBack] = useState(false);

  useEffect(() => {
    const onOnline = () => {
      setBack(true);
      // Small delay so the "back online" state is visible before reloading.
      setTimeout(() => window.location.reload(), 600);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[420px] flex-col items-center justify-center px-6 text-center">
      <svg viewBox="0 0 32 32" width="56" height="56" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0D1F26" />
        <path
          d="M3.5 16c4.8-5.4 12-5.4 17.2-.8l5.1-3.5c.9-.6 2 .3 1.6 1.3L25.9 16l1.5 3c.4 1-.7 1.9-1.6 1.3l-5.1-3.5C15.5 21.4 8.3 21.4 3.5 16z"
          fill="#F2EBD9"
        />
        <circle cx="8.4" cy="15.2" r="1.3" fill="#0D1F26" />
      </svg>

      <h1 className="mt-5 font-serif text-[22px] font-semibold text-ink">
        {back ? "Back online — reloading…" : "You're offline"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {back
          ? "Reconnecting you now."
          : "This page hasn't been opened yet, so there's nothing saved to show. Pages you've already visited still work offline, and anything you enter is saved on this device and will sync automatically when you're back online."}
      </p>

      {!back && (
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-card2"
        >
          Try again
        </button>
      )}
    </div>
  );
}
