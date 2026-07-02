"use client";

import { useState, type ReactNode } from "react";
import { useCopy } from "@/lib/copy/CopyProvider";

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
      <span className="mb-1 block text-xs font-medium text-muted">
        {label}
        {hint && <span className="ml-1 font-normal text-faint">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Paper card surface used for every settings section. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-hair bg-card p-[18px] ${className}`}
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
  const t = useCopy();
  const [open, setOpen] = useState(false);
  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">{summary}</div>
        <button
          type="button"
          data-testid={`${testId}-edit`}
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-lg border border-hair bg-card px-2.5 py-1 text-xs font-medium text-text transition-colors hover:bg-card2"
        >
          {open ? t("settings.editToggle.close") : t("settings.editToggle.edit")}
        </button>
      </div>
      {open && (
        <div className="mt-3 rounded-lg border border-hair2 bg-card2 p-3">
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
      className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
      style={{ background: "var(--accent)" }}
    >
      {children}
    </button>
  );
}
