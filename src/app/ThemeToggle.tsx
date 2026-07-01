"use client";

import { useState } from "react";

/**
 * Night-mode toggle. Flips `.dark` on <html> immediately (no reload) and
 * persists the choice in a year-long cookie so the server can render the right
 * theme on the next request (no flash). Initial state comes from the server
 * (layout reads the cookie), so this starts in sync.
 */
export default function ThemeToggle({ initialDark }: { initialDark: boolean }) {
  const [dark, setDark] = useState(initialDark);

  function toggle() {
    const next = !dark;
    setDark(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next);
    document.cookie = `nf_theme=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
