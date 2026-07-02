import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getAppConfig } from "@/lib/config";
import { pkr, dateShort } from "@/lib/format";
import { BAD_DEBT_SUBCATEGORIES } from "@/lib/enums";
import { groupForPrint, type BadDebtRow, type BadDebtSubCategory } from "../summary";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function BadDebtsPrintPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "reports");
  const cfg = await getAppConfig();
  if (!cfg.features.reports) redirect("/");
  const scope = entityScope(ctx);

  const entries = await prisma.badDebtEntry.findMany({
    where: scope,
    include: {
      party: { select: { name: true } },
      invoice: { select: { invoiceNumber: true } },
    },
    orderBy: { date: "desc" },
  });

  const rows: BadDebtRow[] = entries.map((e) => ({
    id: e.id,
    personName: e.personName,
    amount: Number(e.amount),
    subCategory: (BAD_DEBT_SUBCATEGORIES.includes(e.subCategory as BadDebtSubCategory)
      ? e.subCategory
      : "bad_debt") as BadDebtSubCategory,
    note: e.note,
    date: e.date.toISOString(),
    partyId: null,
    partyName: e.party?.name ?? null,
    invoiceId: null,
    invoiceNumber: e.invoice?.invoiceNumber ?? null,
  }));

  const { groups, grandTotal } = groupForPrint(rows);

  // Compute the formatted "today" string here (server page owns the clock) and
  // pass it down — no tested pure helper reads the clock.
  const asOfToday = dateShort(new Date());

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-slate-900 print:p-0">
      {/* Screen-only toolbar (hidden on print). */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/reports/bad-debts" className="text-sm text-slate-400 hover:text-cyan-700">
          ← Back to ledger
        </Link>
        <PrintButton />
      </div>

      {/* Book / title header */}
      <div className="flex items-start justify-between border-b border-slate-300 pb-4">
        <div>
          <div className="text-2xl font-bold tracking-tight">{ctx.entityName}</div>
          <div className="text-sm text-slate-500">Seafood trading &amp; distribution</div>
        </div>
        <div className="text-right text-sm">
          <div className="text-lg font-semibold">BAD DEBTS &amp; DISPUTES</div>
          <div className="text-slate-500">as of {asOfToday}</div>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No bad-debt or dispute entries recorded.</p>
      ) : (
        groups.map((g) => (
          <div key={g.subCategory} className="mt-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-600">
              {g.title}
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 text-left">
                  <th className="py-2">Date</th>
                  <th className="py-2">Party / person</th>
                  <th className="py-2">Invoice</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-200 align-top">
                    <td className="py-2 pr-2">{dateShort(r.date)}</td>
                    <td className="py-2 pr-2">{r.partyName ?? r.personName}</td>
                    <td className="py-2 pr-2 font-mono">
                      {r.invoiceNumber !== null ? `#${r.invoiceNumber}` : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right font-medium">{pkr(r.amount)}</td>
                    <td className="py-2 text-slate-600">{r.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300">
                  <td colSpan={3} className="py-2 text-right text-xs uppercase text-slate-500">
                    {g.title} subtotal
                  </td>
                  <td className="py-2 text-right font-semibold">{pkr(g.subtotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ))
      )}

      {groups.length > 0 && (
        <div className="mt-8 flex items-center justify-end gap-6 border-t-2 border-slate-400 pt-3">
          <span className="text-xs uppercase text-slate-500">Grand total</span>
          <span className="text-lg font-bold">{pkr(grandTotal)}</span>
        </div>
      )}
    </div>
  );
}
