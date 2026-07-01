"use client";

import { useState, type ReactNode } from "react";

/** Small labelled field wrapper, matching the pattern used across the app. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
        {hint && (
          <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
            · {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

/** Dark-aware card surface used for every settings section. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * A collapsible "Edit" row wrapper. Renders a compact summary with an Edit
 * toggle; when open, swaps in the supplied edit form. Keeps list pages tidy.
 */
export function EditToggle({
  testId,
  summary,
  children,
}: {
  testId: string;
  summary: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">{summary}</div>
        <button
          type="button"
          data-testid={`${testId}-edit`}
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {open ? "Close" : "Edit"}
        </button>
      </div>
      {open && (
        <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Primary submit button (shared style). */
export function PrimaryButton({
  children,
  disabled,
  onClick,
  testId,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
