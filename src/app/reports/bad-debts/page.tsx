import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getAppConfig, getCopy } from "@/lib/config";
import { pkr, dateShort } from "@/lib/format";
import type { TFn } from "@/lib/copy";
import { BAD_DEBT_SUBCATEGORIES } from "@/lib/enums";
import { BackLink, Card, Chip, Th } from "@/components/ui";
import SharePdfButton from "@/components/SharePdfButton";
import type { BadDebtsPdfData } from "@/lib/pdf/types";
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

const FILTER_TABS: { key: Filter; labelKey: string }[] = [
  { key: "all", labelKey: "reports.badDebts.tab.all" },
  { key: "bad_debt", labelKey: "reports.badDebts.tab.badDebt" },
  { key: "dispute", labelKey: "reports.badDebts.tab.dispute" },
];

function normalizeFilter(raw?: string): Filter {
  if (raw === "bad_debt" || raw === "dispute") return raw;
  return "all";
}

/** Sub-category chip — warn tone for dispute, neg tone for bad_debt. */
function SubCategoryChip({ sub, t }: { sub: BadDebtSubCategory; t: TFn }) {
  if (sub === "dispute") {
    return <Chip tone="warn">{t("reports.badDebts.chip.dispute")}</Chip>;
  }
  return <Chip tone="neg">{t("reports.badDebts.chip.badDebt")}</Chip>;
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
  const cfg = await getAppConfig();
  if (!cfg.features.reports) redirect("/");
  const t = await getCopy();
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

  const badDebtsPdf: BadDebtsPdfData = {
    businessName: cfg.branding.appName,
    rows: rows.map((r) => ({
      dateISO: r.date,
      name: r.partyName ?? r.personName,
      invoiceNumber: r.invoiceNumber != null ? String(r.invoiceNumber) : null,
      type: r.subCategory === "dispute" ? "Dispute" : "Bad debt",
      amount: r.amount,
      note: r.note,
    })),
    badDebtTotal: totals.badDebt,
    disputeTotal: totals.dispute,
    grandTotal: totals.grand,
  };

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
        <BackLink href="/reports">{t("reports.badDebts.back")}</BackLink>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              {t("reports.badDebts.eyebrow")}
            </div>
            <h1 className="mt-0.5 font-serif text-[28px] font-semibold leading-tight text-ink">
              {t("reports.badDebts.title")}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {t("reports.badDebts.subtitlePrefix")}{ctx.entityName}{t("reports.badDebts.subtitleSuffix")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/reports/bad-debts/print"
              data-testid="bd-print-link"
              className="rounded-lg border border-hair bg-card px-3.5 py-2 text-sm font-semibold text-text transition-colors hover:bg-card2"
            >
              {t("reports.badDebts.printSummary")}
            </Link>
            <SharePdfButton
              kind="badDebts"
              payload={badDebtsPdf}
              filename="Bad-debts-and-disputes.pdf"
              shareText={`${cfg.branding.appName} — bad debts & disputes summary`}
              testid="share-bad-debts"
            />
            <AddBadDebtForm parties={formParties} invoices={formInvoices} />
          </div>
        </div>
      </div>

      {/* Summary cards for the active filter/book. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label={t("reports.badDebts.summary.badDebts")} value={totals.badDebt} tone="neg" testid="bd-total-bad_debt" />
        <SummaryCard label={t("reports.badDebts.summary.disputed")} value={totals.dispute} tone="warn" testid="bd-total-dispute" />
        <SummaryCard label={t("reports.badDebts.summary.grandTotal")} value={totals.grand} tone="ink" testid="bd-total-grand" />
      </div>

      {/* Filter tabs. */}
      <div className="flex flex-wrap gap-2 text-sm">
        {FILTER_TABS.map((tab) => {
          const active = tab.key === filter;
          const href = tab.key === "all" ? "/reports/bad-debts" : `/reports/bad-debts?filter=${tab.key}`;
          return (
            <Link
              key={tab.key}
              href={href}
              data-testid={`bd-tab-${tab.key}`}
              className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                active
                  ? "text-on-accent"
                  : "border border-hair bg-card text-muted hover:bg-card2"
              }`}
              style={active ? { background: "var(--accent)" } : undefined}
            >
              {t(tab.labelKey)}
            </Link>
          );
        })}
      </div>

      {/* Ledger table. */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>{t("reports.badDebts.th.date")}</Th>
              <Th>{t("reports.badDebts.th.party")}</Th>
              <Th>{t("reports.badDebts.th.invoice")}</Th>
              <Th>{t("reports.badDebts.th.type")}</Th>
              <Th align="right">{t("reports.badDebts.th.amount")}</Th>
              <Th>{t("reports.badDebts.th.note")}</Th>
              <Th align="right">{t("reports.badDebts.th.actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3.5 py-6 text-center text-sm text-faint">
                  {t("reports.badDebts.empty")}{filter !== "all" ? t("reports.badDebts.emptyFilterSuffix") : ""}.
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
                    <SubCategoryChip sub={r.subCategory} t={t} />
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
        </div>
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
