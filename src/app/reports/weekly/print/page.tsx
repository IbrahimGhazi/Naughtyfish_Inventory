import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { pkr, dateShort } from "@/lib/format";
import {
  buildWeeklyStatement,
  defaultWeekRange,
  type StatementRow,
} from "@/lib/reports";
import PrintButton from "./PrintButton";

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

function byOutstandingDesc(rows: StatementRow[]): StatementRow[] {
  return [...rows].sort((a, b) => b.outstanding - a.outstanding);
}

export default async function WeeklyStatementPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const ctx = await getActiveContext();

  // Default to the current week when the range params are absent/invalid.
  const now = new Date();
  const fromDate = parseDay(from, false);
  const toDate = parseDay(to, true);
  const range =
    fromDate && toDate ? { from: fromDate, to: toDate } : defaultWeekRange(now);

  // entity/book name for the header (scoped to the active book).
  const entity = await prisma.entity.findFirst({ where: { id: ctx.entityId } });

  const stmt = await buildWeeklyStatement(ctx.entityId, range.to);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-slate-900 print:p-0">
      {/* Screen-only toolbar (hidden on print). */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href={`/reports/weekly?from=${from ?? ""}&to=${to ?? ""}`}
          className="text-sm text-slate-400 hover:text-cyan-700"
        >
          ← Back to statement
        </Link>
        <PrintButton />
      </div>

      {/* Company / book header */}
      <div className="flex items-start justify-between border-b border-slate-300 pb-4">
        <div>
          <div className="text-2xl font-bold tracking-tight">
            {entity?.name ?? ctx.entityName}
          </div>
          <div className="text-sm text-slate-500">Seafood trading &amp; distribution</div>
        </div>
        <div className="text-right text-sm">
          <div className="text-lg font-semibold">WEEKLY STATEMENT</div>
          <div className="text-slate-500">
            {dateShort(range.from)} — {dateShort(range.to)}
          </div>
          <div className="text-slate-500">Balances as of {dateShort(range.to)}</div>
        </div>
      </div>

      {/* Receivables — corporate + local. */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Receivables — owed to us
          </h2>
          <span className="font-semibold">{pkr(stmt.receivablesTotal)}</span>
        </div>
        <ReceivablesSection title="Corporate customers" rows={stmt.corporate} />
        <ReceivablesSection title="Local customers" rows={stmt.local} />
      </div>

      {/* Payables — suppliers. */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Payables — we owe
          </h2>
          <span className="font-semibold">{pkr(stmt.payablesTotal)}</span>
        </div>
        <PayablesSection rows={stmt.suppliers} />
      </div>

      {/* Net position. */}
      <div className="mt-8 border-t-2 border-slate-300 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm uppercase text-slate-500">
            Net position (receivables − payables)
          </span>
          <span className="text-lg font-bold">{pkr(stmt.net)}</span>
        </div>
      </div>
    </div>
  );
}

function ReceivablesSection({ title, rows }: { title: string; rows: StatementRow[] }) {
  const sorted = byOutstandingDesc(rows);
  const subtotal = sorted.reduce((s, r) => s + r.outstanding, 0);

  return (
    <div className="mt-4">
      <div className="text-xs font-semibold uppercase text-slate-400">{title}</div>
      {sorted.length === 0 ? (
        <p className="mt-1 text-sm text-slate-400">No outstanding balance.</p>
      ) : (
        <table className="mt-1 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-300 text-left">
              <th className="py-2">Party</th>
              <th className="py-2">Open invoices</th>
              <th className="py-2 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.partyId} className="border-b border-slate-200 align-top">
                <td className="py-2 font-medium">{r.name}</td>
                <td className="py-2 text-xs text-slate-600">
                  {r.invoices.length === 0
                    ? "—"
                    : r.invoices
                        .map(
                          (inv) => `#${inv.number}${inv.reference ? ` · ${inv.reference}` : ""}`,
                        )
                        .join(", ")}
                </td>
                <td className="py-2 text-right font-medium">{pkr(r.outstanding)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300">
              <td colSpan={2} className="py-2 text-right text-xs uppercase text-slate-500">
                Subtotal
              </td>
              <td className="py-2 text-right font-bold">{pkr(subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

function PayablesSection({ rows }: { rows: StatementRow[] }) {
  const sorted = byOutstandingDesc(rows);
  const subtotal = sorted.reduce((s, r) => s + r.outstanding, 0);

  return (
    <div className="mt-4">
      <div className="text-xs font-semibold uppercase text-slate-400">Suppliers</div>
      {sorted.length === 0 ? (
        <p className="mt-1 text-sm text-slate-400">No outstanding balance.</p>
      ) : (
        <table className="mt-1 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-300 text-left">
              <th className="py-2">Supplier</th>
              <th className="py-2 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.partyId} className="border-b border-slate-200">
                <td className="py-2 font-medium">{r.name}</td>
                <td className="py-2 text-right font-medium">{pkr(r.outstanding)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300">
              <td className="py-2 text-right text-xs uppercase text-slate-500">Subtotal</td>
              <td className="py-2 text-right font-bold">{pkr(subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
