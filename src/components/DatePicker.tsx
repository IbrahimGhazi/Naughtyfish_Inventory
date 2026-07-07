"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom calendar dropdown — a themed drop-in replacement for
 * `<input type="date">`. Browsers render the native date-picker popup with
 * OS-level chrome that CSS can only nudge between a light/dark preset; it can
 * never be recolored to this app's actual palette. This component uses the
 * same design tokens as every other surface (bg-card, border-hair, text-ink,
 * bg-accent, …) so it matches in both light and dark mode automatically.
 *
 * Two usage modes:
 *  - Controlled (client forms): pass `value` + `onChange`.
 *  - Uncontrolled (plain <form action="..."> GET/POST, no JS handler): pass
 *    `name` (+ optional `defaultValue`) — a hidden input keeps the value in
 *    the surrounding form's submission, same as a real <input type="date">.
 *
 * Value format is always "YYYY-MM-DD" (or "" for empty), matching what the
 * native input produced, so callers don't need to change any parsing logic.
 */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
  /** Inclusive bounds, "YYYY-MM-DD". */
  min?: string;
  max?: string;
}

/** Parse "YYYY-MM-DD" as a LOCAL date (avoids the UTC-midnight day-shift bug
 *  that `new Date(str)` has near timezone boundaries). Returns null if blank
 *  or malformed. */
function parseYMD(s: string | undefined): { y: number; m: number; d: number } | null {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function toYMD(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplay(s: string): string {
  const p = parseYMD(s);
  if (!p) return "";
  return `${p.d} ${MONTH_NAMES[p.m].slice(0, 3)} ${p.y}`;
}

function todayYMD(): string {
  const t = new Date();
  return toYMD(t.getFullYear(), t.getMonth(), t.getDate());
}

export default function DatePicker({
  value,
  onChange,
  name,
  defaultValue,
  placeholder = "Select date",
  className = "",
  disabled = false,
  min,
  max,
  ...rest
}: DatePickerProps) {
  const testid = rest["data-testid"];
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const effective = isControlled ? value! : internal;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (parseYMD(effective) ?? parseYMD(todayYMD())!).y);
  const [viewMonth, setViewMonth] = useState(() => (parseYMD(effective) ?? parseYMD(todayYMD())!).m);

  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openPicker() {
    if (disabled) return;
    const p = parseYMD(effective) ?? parseYMD(todayYMD())!;
    setViewYear(p.y);
    setViewMonth(p.m);
    setOpen(true);
  }

  function commit(next: string) {
    if (!isControlled) setInternal(next);
    onChange?.(next);
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 0) { m = 11; y -= 1; }
    else if (m > 11) { m = 0; y += 1; }
    setViewYear(y);
    setViewMonth(m);
  }

  const minP = parseYMD(min);
  const maxP = parseYMD(max);
  function inRange(y: number, m: number, d: number): boolean {
    const ymd = toYMD(y, m, d);
    if (minP && ymd < toYMD(minP.y, minP.m, minP.d)) return false;
    if (maxP && ymd > toYMD(maxP.y, maxP.m, maxP.d)) return false;
    return true;
  }

  const selected = parseYMD(effective);
  const today = parseYMD(todayYMD())!;

  // 6x7 grid, filled with the trailing days of the previous month and the
  // leading days of the next month so the layout height never jumps.
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInView = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  const cells: { y: number; m: number; d: number; inMonth: boolean }[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    const d = daysInPrev - firstWeekday + 1 + i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ y, m, d, inMonth: false });
  }
  for (let d = 1; d <= daysInView; d++) cells.push({ y: viewYear, m: viewMonth, d, inMonth: true });
  while (cells.length < 42) {
    const idx = cells.length - (firstWeekday + daysInView);
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ y, m, d: idx + 1, inMonth: false });
  }

  return (
    <div ref={wrapRef} className="relative">
      {!isControlled && name && <input type="hidden" name={name} value={internal} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPicker())}
        data-testid={testid}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`input flex items-center justify-between gap-2 text-left ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}
      >
        <span className={effective ? "text-text" : "text-faint"}>
          {effective ? formatDisplay(effective) : placeholder}
        </span>
        <CalendarGlyph />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute left-0 top-full z-50 mt-1.5 w-[260px] rounded-xl border border-hair bg-card p-2.5"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          {/* Month/year nav */}
          <div className="mb-1.5 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-12)} title="Previous year" className="rounded-md px-1.5 py-1 text-[11px] text-faint hover:bg-card2 hover:text-text">«</button>
            <button type="button" onClick={() => shiftMonth(-1)} title="Previous month" className="rounded-md px-1.5 py-1 text-[13px] text-faint hover:bg-card2 hover:text-text">‹</button>
            <span className="text-[12.5px] font-semibold text-ink">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={() => shiftMonth(1)} title="Next month" className="rounded-md px-1.5 py-1 text-[13px] text-faint hover:bg-card2 hover:text-text">›</button>
            <button type="button" onClick={() => shiftMonth(12)} title="Next year" className="rounded-md px-1.5 py-1 text-[11px] text-faint hover:bg-card2 hover:text-text">»</button>
          </div>

          {/* Weekday header */}
          <div className="grid gap-y-0.5 text-center" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {WEEKDAY_LABELS.map((w) => (
              <span key={w} className="text-[10px] font-semibold uppercase text-faint2">{w}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid gap-y-0.5 text-center" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((c, i) => {
              const isSelected = !!selected && selected.y === c.y && selected.m === c.m && selected.d === c.d;
              const isToday = today.y === c.y && today.m === c.m && today.d === c.d;
              const enabled = inRange(c.y, c.m, c.d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!enabled}
                  onClick={() => commit(toYMD(c.y, c.m, c.d))}
                  className={[
                    "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[12px] transition-colors",
                    !enabled ? "cursor-not-allowed text-faint2 opacity-40" :
                      isSelected ? "font-semibold text-on-accent" :
                      c.inMonth ? "text-text hover:bg-card2" : "text-faint2 hover:bg-card2",
                    !isSelected && isToday ? "font-semibold text-accent-deep" : "",
                  ].join(" ")}
                  style={isSelected ? { background: "var(--accent)" } : undefined}
                >
                  {c.d}
                </button>
              );
            })}
          </div>

          {/* Footer: Today / Clear */}
          <div className="mt-1.5 flex items-center justify-between border-t border-hair2 pt-1.5">
            <button type="button" onClick={() => commit(todayYMD())} className="text-[11.5px] font-semibold text-accent-deep hover:underline">
              Today
            </button>
            {!!effective && (
              <button type="button" onClick={() => commit("")} className="text-[11.5px] text-faint hover:text-neg hover:underline">
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-faint">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}
