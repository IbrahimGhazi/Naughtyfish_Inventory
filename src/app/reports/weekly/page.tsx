import Link from "next/link";
import { getActiveContext } from "@/lib/session";
import { pkr, dateShort } from "@/lib/format";
import {
  buildWeeklyStatement,
  defaultWeekRange,
  presetRange,
  type RangePreset,
  type StatementRow,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

/** Parse a yyyy-mm-dd query param to a local Date, or undefined if blank/invalid. */
function parseDay(v: string | undefined, endOfDay: boolean): Date | undefined {
  if (!v) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return undefined;
  const [, y, mo, d] = m;
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
}

/** yyyy-mm-dd for a Date, for form defaults and ISO query params. */
function toDayValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "this_week", label: "This week" },
  { key: "last_week", label: "Last week" },
  { key: "this_month", label: "This month" },
];

export default async function WeeklyStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const { from, to, preset } = await searchParams;
  const ctx = await getActiveContext();

  // The PAGE decides "now" (the pure helpers must not read the clock).
  const now = new Date();

  // Resolve the active range: explicit preset > explicit from/to > default week.
  let range: { from: Date; to: Date };
  if (preset === "this_week" || preset === "last_week" || preset === "this_month") {
    range = presetRange(preset, now);
  } else {
    const fromDate = parseDay(from, false);
    const toDate = parseDay(to, true);
    if (fromDate && toDate) {
      range = { from: fromDate, to: toDate };
    } else {
      range = defaultWeekRange(now);
    }
  }

  const fromValue = toDayValue(range.from);
  const toValue = toDayValue(range.to);

  // The statement is as-of the END of the range.
  const stmt = await buildWeeklyStatement(ctx.entityId, range.to);

  const printHref = `/reports/weekly/print?from=${fromValue}&to=${toValue}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/reports"
            className="text-xs text-slate-400 hover:text-cyan-700 dark:text-slate-500 dark:hover:text-cyan-400"
          >
            ← Reports
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Weekly statement</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {ctx.entityName} · {dateShort(range.from)} → {dateShort(range.to)} · balances as of{" "}
            {dateShort(range.to)}
          </p>
        </div>
        <Link
          href={printHref}
          data-testid="wk-print"
          className="shrink-0 rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800"
        >
          Print / Save as PDF
        </Link>
      </div>

      {/* Preset quick-links */}
      <div className="flex flex-wrap gap-2 text-sm">
        {PRESETS.map((p) => (
          <Link
            key={p.key}
            href={`/reports/weekly?preset=${p.key}`}
            data-testid={`wk-preset-${p.key}`}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-cyan-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-800"
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Explicit from/to GET form (like the party ledger as-of filter). */}
      <form className="flex flex-wrap items-end gap-2 text-sm" action="/reports/weekly">
        <label className="text-xs text-slate-500 dark:text-slate-400">
          From
          <input
            type="date"
            name="from"
            defaultValue={fromValue}
            data-testid="wk-from"
            className="input mt-1"
          />
        </label>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          To
          <input
            type="date"
            name="to"
            defaultValue={toValue}
            data-testid="wk-to"
            className="input mt-1"
          />
        </label>
        <button
          type="submit"
          data-testid="wk-apply"
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          Apply
        </button>
      </form>

      {/* Receivables — corporate + local sub-sections. */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Receivables — owed to us
          </h2>
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
            {pkr(stmt.receivablesTotal)}
          </span>
        </div>

        <ReceivablesTable
          title="Corporate customers"
          rows={stmt.corporate}
          emptyLabel="No corporate customers with an outstanding balance."
        />
        <ReceivablesTable
          title="Local customers"
          rows={stmt.local}
          emptyLabel="No local customers with an outstanding balance."
        />
      </section>

      {/* Payables — suppliers we owe. */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Payables — we owe
          </h2>
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            {pkr(stmt.payablesTotal)}
          </span>
        </div>
        <PayablesTable rows={stmt.suppliers} />
      </section>

      {/* Net position. */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Net position (receivables − payables)
          </span>
          <span
            className={`text-lg font-semibold ${
              stmt.net >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {pkr(stmt.net)}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Positive = net owed to us. {pkr(stmt.receivablesTotal)} receivable −{" "}
          {pkr(stmt.payablesTotal)} payable.
        </p>
      </div>
    </div>
  );
}

/** Sort a copy of the rows by outstanding, descending. */
function byOutstandingDesc(rows: StatementRow[]): StatementRow[] {
  return [...rows].sort((a, b) => b.outstanding - a.outstanding);
}

function ReceivablesTable({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: StatementRow[];
  emptyLabel: string;
}) {
  const sorted = byOutstandingDesc(rows);
  const subtotal = sorted.reduce((s, r) => s + r.outstanding, 0);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {title}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
          <tr>
            <th className="px-4 py-2">Party</th>
            <th className="px-4 py-2">Open invoices</th>
            <th className="px-4 py-2 text-right">Outstanding</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={r.partyId}>
                <td className="px-4 py-2 font-medium">
                  <Link
                    href={`/parties/${r.partyId}`}
                    className="hover:text-cyan-700 dark:hover:text-cyan-400"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                  {r.invoices.length === 0
                    ? "—"
                    : r.invoices
                        .map((inv) => `#${inv.number}${inv.reference ? ` · ${inv.reference}` : ""}`)
                        .join(", ")}
                </td>
                <td className="px-4 py-2 text-right font-medium">{pkr(r.outstanding)}</td>
              </tr>
            ))
          )}
        </tbody>
        {sorted.length > 0 && (
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <td colSpan={2} className="px-4 py-2 text-right text-xs uppercase text-slate-500 dark:text-slate-400">
                Subtotal
              </td>
              <td className="px-4 py-2 text-right font-semibold">{pkr(subtotal)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function PayablesTable({ rows }: { rows: StatementRow[] }) {
  const sorted = byOutstandingDesc(rows);
  const subtotal = sorted.reduce((s, r) => s + r.outstanding, 0);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Suppliers
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
          <tr>
            <th className="px-4 py-2">Supplier</th>
            <th className="px-4 py-2 text-right">Outstanding</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                No suppliers with an outstanding balance.
              </td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={r.partyId}>
                <td className="px-4 py-2 font-medium">
                  <Link
                    href={`/parties/${r.partyId}`}
                    className="hover:text-cyan-700 dark:hover:text-cyan-400"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right font-medium">{pkr(r.outstanding)}</td>
              </tr>
            ))
          )}
        </tbody>
        {sorted.length > 0 && (
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <td className="px-4 py-2 text-right text-xs uppercase text-slate-500 dark:text-slate-400">
                Subtotal
              </td>
              <td className="px-4 py-2 text-right font-semibold">{pkr(subtotal)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
