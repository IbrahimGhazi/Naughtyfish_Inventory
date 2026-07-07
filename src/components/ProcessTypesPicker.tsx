"use client";

import { PROCESS_TYPES, PROCESS_TYPE_LABELS, type ProcessType } from "@/lib/enums";

/**
 * Checkbox group for picking process types. Used for store capabilities, an
 * in-house transformation, supplier processing on a purchase line, and a
 * store-to-store transfer. `allowed` (when given) enables only those types —
 * the rest render disabled + dimmed with a tooltip, which is the capability gate.
 */
export default function ProcessTypesPicker({
  value,
  onChange,
  allowed,
  idPrefix,
  disabledReason,
}: {
  value: string[];
  onChange: (next: ProcessType[]) => void;
  /** If given, only these types are selectable; others render disabled. */
  allowed?: readonly string[];
  idPrefix: string;
  /** Tooltip shown on disabled types (e.g. "this store can't do it"). */
  disabledReason?: string;
}) {
  const toggle = (t: ProcessType, on: boolean) => {
    const set = new Set(value);
    if (on) set.add(t);
    else set.delete(t);
    onChange(PROCESS_TYPES.filter((x) => set.has(x)));
  };

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {PROCESS_TYPES.map((t) => {
        const enabled = !allowed || allowed.includes(t);
        const checked = value.includes(t);
        return (
          <label
            key={t}
            className={`flex items-center gap-1.5 text-[13px] ${
              enabled ? "text-text cursor-pointer" : "text-faint cursor-not-allowed opacity-50"
            }`}
            title={enabled ? undefined : disabledReason}
          >
            <input
              type="checkbox"
              data-testid={`${idPrefix}-ptype-${t}`}
              className="h-4 w-4 accent-[var(--accent)]"
              checked={checked}
              disabled={!enabled}
              onChange={(e) => toggle(t, e.target.checked)}
            />
            {PROCESS_TYPE_LABELS[t]}
          </label>
        );
      })}
    </div>
  );
}
