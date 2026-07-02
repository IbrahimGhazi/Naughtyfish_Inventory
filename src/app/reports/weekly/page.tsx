import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { getAppConfig } from "@/lib/config";
import { pkr, dateShort } from "@/lib/format";
import { BackLink, Card, PrimaryButton, Th } from "@/components/ui";
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
  requirePage(ctx, "reports");
  const cfg = await getAppConfig();
  if (!cfg.features.reports) redirect("/");

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
    <div className="animate-rise space-y-5">
      <div>
        <BackLink href="/reports">← Reports</BackLink>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              Insight
            </div>
            <h1 className="mt-0.5 font-serif text-[28px] font-semibold leading-tight text-ink">
              Weekly statement
            </h1>
            <p className="mt-1 text-sm text-muted">
              {ctx.entityName} · {dateShort(range.from)} → {dateShort(range.to)} · balances as of{" "}
              {dateShort(range.to)}
            </p>
          </div>
          <PrimaryButton
            href={printHref}
            data-testid="wk-print"
            style={{ background: "var(--ink)", color: "var(--card)" }}
          >
            Print / Save as PDF
          </PrimaryButton>
        </div>
      </div>

      {/* Preset quick-links */}
      <div className="flex flex-wrap gap-2 text-sm">
        {PRESETS.map((p) => (
          <Link
            key={p.key}
            href={`/reports/weekly?preset=${p.key}`}
            data-testid={`wk-preset-${p.key}`}
            className="rounded-lg border border-hair bg-card px-3 py-1.5 font-semibold text-text transition-colors hover:bg-card2"
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Explicit from/to GET form (like the party ledger as-of filter). */}
      <form className="flex flex-wrap items-end gap-2 text-sm" action="/reports/weekly">
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-faint2">
          From
          <input
            type="date"
            name="from"
            defaultValue={fromValue}
            data-testid="wk-from"
            className="input mt-1 block font-normal normal-case tracking-normal"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.1em] text-faint2">
          To
          <input
            type="date"
            name="to"
            defaultValue={toValue}
            data-testid="wk-to"
            className="input mt-1 block font-normal normal-case tracking-normal"
          />
        </label>
        <button
          type="submit"
          data-testid="wk-apply"
          className="rounded-lg border border-hair bg-card px-3 py-2 font-semibold text-text transition-colors hover:bg-card2"
        >
          Apply
        </button>
      </form>

      {/* Receivables — corporate + local sub-sections. */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint2">
            Receivables — owed to us
          </h2>
          <span className="font-mono text-sm font-semibold text-neg">
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
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint2">
            Payables — we owe
          </h2>
          <span className="font-mono text-sm font-semibold text-warn">
            {pkr(stmt.payablesTotal)}
          </span>
        </div>
        <PayablesTable rows={stmt.suppliers} />
      </section>

      {/* Net position. */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Net position (receivables − payables)</span>
          <span
            className={`font-mono text-lg font-semibold ${stmt.net >= 0 ? "text-pos" : "text-neg"}`}
          >
            {pkr(stmt.net)}
          </span>
        </div>
        <p className="mt-1 text-[11.5px] text-faint">
          Positive = net owed to us. {pkr(stmt.receivablesTotal)} receivable −{" "}
          {pkr(stmt.payablesTotal)} payable.
        </p>
      </Card>
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
    <Card className="overflow-hidden">
      <div className="border-b border-hair2 bg-card2 px-3.5 py-2.5 font-serif text-[15px] font-semibold text-ink">
        {title}
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th>Party</Th>
            <Th>Open invoices</Th>
            <Th align="right">Outstanding</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-3.5 py-6 text-center text-sm text-faint">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={r.partyId} className="border-b border-row transition-colors hover:bg-card2">
                <td className="px-3.5 py-3 text-[13px] font-semibold text-text">
                  <Link href={`/parties/${r.partyId}`} className="hover:text-accent-deep">
                    {r.name}
                  </Link>
                </td>
                <td className="px-3.5 py-3 font-mono text-[12px] text-muted">
                  {r.invoices.length === 0
                    ? "—"
                    : r.invoices
                        .map((inv) => `#${inv.number}${inv.reference ? ` · ${inv.reference}` : ""}`)
                        .join(", ")}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[12.5px] font-semibold text-text">
                  {pkr(r.outstanding)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {sorted.length > 0 && (
          <tfoot>
            <tr className="border-t border-hair2 bg-card2">
              <td
                colSpan={2}
                className="px-3.5 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2"
              >
                Subtotal
              </td>
              <td className="px-3.5 py-2.5 text-right font-mono text-[12.5px] font-semibold text-ink">
                {pkr(subtotal)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </Card>
  );
}

function PayablesTable({ rows }: { rows: StatementRow[] }) {
  const sorted = byOutstandingDesc(rows);
  const subtotal = sorted.reduce((s, r) => s + r.outstanding, 0);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-hair2 bg-card2 px-3.5 py-2.5 font-serif text-[15px] font-semibold text-ink">
        Suppliers
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <Th>Supplier</Th>
            <Th align="right">Outstanding</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-3.5 py-6 text-center text-sm text-faint">
                No suppliers with an outstanding balance.
              </td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={r.partyId} className="border-b border-row transition-colors hover:bg-card2">
                <td className="px-3.5 py-3 text-[13px] font-semibold text-text">
                  <Link href={`/parties/${r.partyId}`} className="hover:text-accent-deep">
                    {r.name}
                  </Link>
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[12.5px] font-semibold text-text">
                  {pkr(r.outstanding)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {sorted.length > 0 && (
          <tfoot>
            <tr className="border-t border-hair2 bg-card2">
              <td className="px-3.5 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
                Subtotal
              </td>
              <td className="px-3.5 py-2.5 text-right font-mono text-[12.5px] font-semibold text-ink">
                {pkr(subtotal)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </Card>
  );
}
