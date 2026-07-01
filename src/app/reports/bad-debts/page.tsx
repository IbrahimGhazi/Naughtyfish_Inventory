import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { pkr, dateShort } from "@/lib/format";
import { BAD_DEBT_SUBCATEGORIES } from "@/lib/enums";
import {
  totalBadDebts,
  type BadDebtRow,
  type BadDebtSubCategory,
} from "./summary";
import {
  AddBadDebtForm,
  DeleteBadDebtButton,
  type FormParty,
  type FormInvoice,
} from "./BadDebtControls";

export const dynamic = "force-dynamic";

type Filter = "all" | BadDebtSubCategory;

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "bad_debt", label: "Bad debts" },
  { key: "dispute", label: "Disputes" },
];

function normalizeFilter(raw?: string): Filter {
  if (raw === "bad_debt" || raw === "dispute") return raw;
  return "all";
}

/** Sub-category chip — red pair for bad_debt, amber pair for dispute. */
function SubCategoryChip({ sub }: { sub: BadDebtSubCategory }) {
  if (sub === "dispute") {
    return (
      <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        Dispute
      </span>
    );
  }
  return (
    <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
      Bad debt
    </span>
  );
}

export default async function BadDebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter = normalizeFilter(rawFilter);
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);

  const subFilter =
    filter === "all" ? {} : { subCategory: filter };

  const [entries, parties, invoices] = await Promise.all([
    prisma.badDebtEntry.findMany({
      where: { ...scope, ...subFilter },
      include: {
        party: { select: { id: true, name: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.party.findMany({
      where: scope,
      select: { id: true, name: true, partyType: true },
      orderBy: { name: "asc" },
    }),
    prisma.invoice.findMany({
      where: scope,
      include: { party: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  // Serialize Decimals/Dates before crossing into the pure helper / client.
  const rows: BadDebtRow[] = entries.map((e) => ({
    id: e.id,
    personName: e.personName,
    amount: Number(e.amount),
    subCategory: (BAD_DEBT_SUBCATEGORIES.includes(e.subCategory as BadDebtSubCategory)
      ? e.subCategory
      : "bad_debt") as BadDebtSubCategory,
    note: e.note,
    date: e.date.toISOString(),
    partyId: e.party?.id ?? null,
    partyName: e.party?.name ?? null,
    invoiceId: e.invoice?.id ?? null,
    invoiceNumber: e.invoice?.invoiceNumber ?? null,
  }));

  const totals = totalBadDebts(rows);

  const formParties: FormParty[] = parties.map((p) => ({
    id: p.id,
    name: p.name,
    partyType: p.partyType,
  }));
  const formInvoices: FormInvoice[] = invoices.map((i) => ({
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    partyId: i.partyId,
    partyName: i.party.name,
    amount: Number(i.totalAmount),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/reports"
            className="text-xs text-slate-400 hover:text-cyan-700 dark:text-slate-500 dark:hover:text-cyan-400"
          >
            ← Reports
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Bad debts &amp; disputes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Write-offs and disputed amounts for {ctx.entityName} — link a party/invoice for dispute defense.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/reports/bad-debts/print"
            data-testid="bd-print-link"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Print summary
          </Link>
          <AddBadDebtForm parties={formParties} invoices={formInvoices} />
        </div>
      </div>

      {/* Summary cards for the active filter/book. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Bad debts" value={totals.badDebt} tone="red" testid="bd-total-bad_debt" />
        <SummaryCard label="Disputed" value={totals.dispute} tone="amber" testid="bd-total-dispute" />
        <SummaryCard label="Grand total" value={totals.grand} tone="slate" testid="bd-total-grand" />
      </div>

      {/* Filter tabs. */}
      <div className="flex flex-wrap gap-2 text-sm">
        {FILTER_TABS.map((t) => {
          const active = t.key === filter;
          const href = t.key === "all" ? "/reports/bad-debts" : `/reports/bad-debts?filter=${t.key}`;
          return (
            <Link
              key={t.key}
              href={href}
              data-testid={`bd-tab-${t.key}`}
              className={`rounded-full px-3 py-1 ${
                active
                  ? "bg-cyan-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Ledger table. */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Party / person</th>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2">Note</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  No entries{filter !== "all" ? " for this filter" : ""}.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{dateShort(r.date)}</td>
                  <td className="px-4 py-2">
                    {r.partyId ? (
                      <Link
                        href={`/parties/${r.partyId}`}
                        className="text-cyan-700 hover:underline dark:text-cyan-400"
                      >
                        {r.partyName}
                      </Link>
                    ) : (
                      <span>{r.personName}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {r.invoiceId ? (
                      <Link
                        href={`/invoices/${r.invoiceId}`}
                        className="font-mono text-cyan-700 hover:underline dark:text-cyan-400"
                      >
                        #{r.invoiceNumber}
                      </Link>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <SubCategoryChip sub={r.subCategory} />
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{pkr(r.amount)}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.note ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <DeleteBadDebtButton id={r.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  testid,
}: {
  label: string;
  value: number;
  tone: "red" | "amber" | "slate";
  testid: string;
}) {
  const valueTone =
    tone === "red"
      ? "text-red-600 dark:text-red-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-800 dark:text-slate-100";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs uppercase text-slate-400 dark:text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${valueTone}`} data-testid={testid}>
        {pkr(value)}
      </div>
    </div>
  );
}
