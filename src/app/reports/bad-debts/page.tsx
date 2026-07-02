import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { pkr, dateShort } from "@/lib/format";
import { BAD_DEBT_SUBCATEGORIES } from "@/lib/enums";
import { BackLink, Card, Chip, Th } from "@/components/ui";
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

/** Sub-category chip — warn tone for dispute, neg tone for bad_debt. */
function SubCategoryChip({ sub }: { sub: BadDebtSubCategory }) {
  if (sub === "dispute") {
    return <Chip tone="warn">Dispute</Chip>;
  }
  return <Chip tone="neg">Bad debt</Chip>;
}

export default async function BadDebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter = normalizeFilter(rawFilter);
  const ctx = await getActiveContext();
  requirePage(ctx, "reports");
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
    <div className="animate-rise space-y-5">
      <div>
        <BackLink href="/reports">← Reports</BackLink>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              Insight
            </div>
            <h1 className="mt-0.5 font-serif text-[28px] font-semibold leading-tight text-ink">
              Bad debts &amp; disputes
            </h1>
            <p className="mt-1 text-sm text-muted">
              Write-offs and disputed amounts for {ctx.entityName} — link a party/invoice for dispute defense.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/reports/bad-debts/print"
              data-testid="bd-print-link"
              className="rounded-lg border border-hair bg-card px-3.5 py-2 text-sm font-semibold text-text transition-colors hover:bg-card2"
            >
              Print summary
            </Link>
            <AddBadDebtForm parties={formParties} invoices={formInvoices} />
          </div>
        </div>
      </div>

      {/* Summary cards for the active filter/book. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Bad debts" value={totals.badDebt} tone="neg" testid="bd-total-bad_debt" />
        <SummaryCard label="Disputed" value={totals.dispute} tone="warn" testid="bd-total-dispute" />
        <SummaryCard label="Grand total" value={totals.grand} tone="ink" testid="bd-total-grand" />
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
              className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                active
                  ? "text-on-accent"
                  : "border border-hair bg-card text-muted hover:bg-card2"
              }`}
              style={active ? { background: "var(--accent)" } : undefined}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Ledger table. */}
      <Card className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Party / person</Th>
              <Th>Invoice</Th>
              <Th>Type</Th>
              <Th align="right">Amount</Th>
              <Th>Note</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3.5 py-6 text-center text-sm text-faint">
                  No entries{filter !== "all" ? " for this filter" : ""}.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-row transition-colors hover:bg-card2">
                  <td className="px-3.5 py-3 font-mono text-[12.5px] text-muted">
                    {dateShort(r.date)}
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-text">
                    {r.partyId ? (
                      <Link href={`/parties/${r.partyId}`} className="text-accent-deep hover:underline">
                        {r.partyName}
                      </Link>
                    ) : (
                      <span>{r.personName}</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3">
                    {r.invoiceId ? (
                      <Link
                        href={`/invoices/${r.invoiceId}`}
                        className="font-mono text-[12.5px] text-accent-deep hover:underline"
                      >
                        #{r.invoiceNumber}
                      </Link>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3">
                    <SubCategoryChip sub={r.subCategory} />
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-[12.5px] font-semibold text-text">
                    {pkr(r.amount)}
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-muted">{r.note ?? "—"}</td>
                  <td className="px-3.5 py-3 text-right">
                    <DeleteBadDebtButton id={r.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
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
  tone: "neg" | "warn" | "ink";
  testid: string;
}) {
  const valueTone =
    tone === "neg" ? "text-neg" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint2">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-semibold ${valueTone}`} data-testid={testid}>
        {pkr(value)}
      </div>
    </Card>
  );
}
