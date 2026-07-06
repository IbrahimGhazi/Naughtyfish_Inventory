import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getAppConfig, getCopy } from "@/lib/config";
import type { TFn } from "@/lib/copy/types";
import { pkr, dateShort } from "@/lib/format";
import { monthlyPnL, agingBuckets, topDebtors } from "@/lib/analytics";
import { cityByName, project } from "@/lib/geo";
import { KARACHI_XY, progressFor } from "@/lib/mapgeo";
import { BarChart, type BarDatum } from "@/components/charts/BarChart";
import { Donut, type DonutSlice } from "@/components/charts/Donut";
import { PakistanMap, type MapRoute } from "@/components/PakistanMap";
import { Card, Kpi, StatusChip, PrimaryButton } from "@/components/ui";
import SalesReportSection from "./SalesReportSection";
import { computeLiveSales } from "@/lib/salesReport";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const ctx = await getActiveContext();
  requirePage(ctx, "dashboard");
  const scope = entityScope(ctx);
  const cfg = await getAppConfig();
  const t = await getCopy();
  const f = cfg.features;

  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // next 24h
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    parties,
    payments,
    dueCheques,
    recent,
    banks,
    allInvoices,
    expensesForChart,
    activeShipments,
    channelCounts,
    purchaseAgg,
  ] = await Promise.all([
    prisma.party.findMany({ where: scope }),
    // All payments in the book, tagged with party type (customer receipts vs
    // supplier disbursements) + partyId/type/date/invoiceId for the breakdowns.
    prisma.payment.findMany({
      where: scope,
      select: {
        amount: true,
        type: true,
        date: true,
        partyId: true,
        invoiceId: true,
        party: { select: { partyType: true } },
      },
    }),
    // Reminder panel: a cheque is "due soon" when its clearingDue OR its
    // reminderDate (set 1 day before due) falls within the next 24h. Union both.
    f.cheques
      ? prisma.cheque.findMany({
          where: {
            ...scope,
            status: { in: ["issued", "pending", "held"] },
            OR: [{ clearingDue: { lte: soon } }, { reminderDate: { lte: soon } }],
          },
          include: { bankAccount: true },
          orderBy: { clearingDue: "asc" },
        })
      : Promise.resolve([]),
    prisma.invoice.findMany({
      where: scope,
      include: { party: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    f.banks ? prisma.bankAccount.findMany({ where: scope }) : Promise.resolve([]),
    // ONE pass over all invoices feeds: P&L revenue, receivables, the aging
    // buckets, top debtors and the drafts-to-review banner.
    prisma.invoice.findMany({
      where: scope,
      select: {
        id: true,
        date: true,
        status: true,
        partyId: true,
        totalAmount: true,
      },
    }),
    // P/L chart source: expense entries in the last 6 months.
    f.expenses
      ? prisma.expenseEntry.findMany({
          where: { ...scope, date: { gte: sixMonthsAgo } },
          select: { date: true, amount: true },
        })
      : Promise.resolve([]),
    // Active shipments (not delivered/cancelled) for the map + in-transit list.
    f.shipments
      ? prisma.shipment.findMany({
          where: { ...scope, status: { notIn: ["delivered", "cancelled"] } },
          orderBy: [{ estimatedArrivalAt: "asc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    // Breakdown: customer invoices by channel (north vs local).
    prisma.invoice.groupBy({
      by: ["channel"],
      where: scope,
      _count: { _all: true },
    }),
    // Supplier purchases: charges on the payables side. Filtered by the
    // party's CURRENT type so this stays consistent with the weekly
    // statement's categorize-by-type behavior (type flips are also blocked
    // once transactions exist — updateParty guard).
    prisma.purchase.aggregate({
      where: { ...scope, supplier: { partyType: "supplier" } },
      _sum: { totalAmount: true },
    }),
  ]);

  // Split payments by the party's type.
  const paymentsFromCustomers = payments
    .filter((p) => p.party.partyType === "customer")
    .reduce((s, p) => s + Number(p.amount), 0);
  const paymentsToSuppliers = payments
    .filter((p) => p.party.partyType === "supplier")
    .reduce((s, p) => s + Number(p.amount), 0);

  // Receivables (net) = Σ customer opening balances + Σ customer invoice totals
  // − Σ payments from customers. Opening balances MUST be included so this KPI
  // agrees with buildPartyLedger (party pages + weekly statement).
  const customers = parties.filter((p) => p.partyType === "customer");
  const customerIds = new Set(customers.map((p) => p.id));
  const customerOpening = customers.reduce((s, p) => s + Number(p.openingBalance), 0);
  const customerInvoiceTotal = allInvoices
    .filter((i) => customerIds.has(i.partyId))
    .reduce((s, i) => s + Number(i.totalAmount), 0);
  const receivablesNet = round2(customerOpening + customerInvoiceTotal - paymentsFromCustomers);

  // Supplier payables = Σ supplier opening balances + Σ purchases − Σ payments
  // made to suppliers (MUST match buildPartyLedger, which charges purchases as
  // supplier-direction debits).
  const supplierOpening = parties
    .filter((p) => p.partyType === "supplier")
    .reduce((s, p) => s + Number(p.openingBalance), 0);
  const purchasesTotal = Number(purchaseAgg._sum.totalAmount ?? 0);
  const supplierPayables = round2(supplierOpening + purchasesTotal - paymentsToSuppliers);

  // Net position includes suppliers (plan §3): receivables_net − supplier_payables.
  const netPosition = round2(receivablesNet - supplierPayables);

  const estBank = banks.reduce((s, b) => s + Number(b.estimatedBalance), 0);

  // Field-entered drafts awaiting office review (delivery-portal flow).
  const draftCount = allInvoices.filter((i) => i.status === "draft").length;

  // --- Profit / Loss chart data (last 6 months). Number()-cast Decimals. ---
  const pnl = monthlyPnL(
    allInvoices
      .filter((i) => customerIds.has(i.partyId) && new Date(i.date) >= sixMonthsAgo)
      .map((i) => ({ date: i.date, amount: Number(i.totalAmount) })),
    expensesForChart.map((e) => ({ date: e.date, amount: Number(e.amount) })),
    now,
    6,
  );
  const barData: BarDatum[] = pnl.map((m) => ({
    label: m.label,
    revenue: round2(m.revenue),
    expenses: round2(m.expenses),
    profit: round2(m.profit),
  }));

  // --- Receivables aging: per-invoice outstanding bucketed by age. ---
  const paidByInvoice = new Map<string, number>();
  for (const p of payments) {
    if (!p.invoiceId) continue;
    paidByInvoice.set(p.invoiceId, (paidByInvoice.get(p.invoiceId) ?? 0) + Number(p.amount));
  }
  const aging = agingBuckets(
    allInvoices.map((i) => ({
      date: i.date,
      total: Number(i.totalAmount),
      paid: paidByInvoice.get(i.id) ?? 0,
    })),
    now,
  );
  const agingTotal = aging.reduce((s, b) => s + b.amount, 0);
  const AGING_COLORS = ["var(--accent)", "var(--gold)", "var(--warn)", "var(--neg)"];

  // --- Top debtors: opening + invoiced − paid, per customer party. ---
  const invoicedByParty = new Map<string, number>();
  for (const i of allInvoices) {
    invoicedByParty.set(i.partyId, (invoicedByParty.get(i.partyId) ?? 0) + Number(i.totalAmount));
  }
  const paidByParty = new Map<string, number>();
  for (const p of payments) {
    paidByParty.set(p.partyId, (paidByParty.get(p.partyId) ?? 0) + Number(p.amount));
  }
  const debtors = topDebtors(
    customers.map((c) => ({ id: c.id, name: c.name, openingBalance: Number(c.openingBalance) })),
    invoicedByParty,
    paidByParty,
    5,
  );
  const maxDebt = Math.max(1, ...debtors.map((d) => d.balance));

  // --- Payment mix (amounts received from customers, last 90 days). ---
  const mix = { cash: 0, cheque: 0, transfer: 0 };
  for (const p of payments) {
    if (p.party.partyType !== "customer") continue;
    if (new Date(p.date) < ninetyDaysAgo) continue;
    if (p.type === "cash" || p.type === "cheque" || p.type === "transfer") {
      mix[p.type] += Number(p.amount);
    }
  }
  const mixTotal = round2(mix.cash + mix.cheque + mix.transfer);
  const mixSlices: DonutSlice[] = [
    { label: t("dashboard.mix.cheque"), value: round2(mix.cheque), fill: "fill-[var(--accent)]", swatch: "bg-[var(--accent)]", hex: "#0e7c7b" },
    { label: t("dashboard.mix.transfer"), value: round2(mix.transfer), fill: "fill-[var(--info)]", swatch: "bg-[var(--info)]", hex: "#3e5d7a" },
    { label: t("dashboard.mix.cash"), value: round2(mix.cash), fill: "fill-[var(--gold)]", swatch: "bg-[var(--gold)]", hex: "#8c6a1f" },
  ];

  // --- Invoices by channel (north vs local split bar). ---
  const channelMap = new Map(channelCounts.map((c) => [c.channel, c._count._all]));
  const northCount = channelMap.get("north") ?? 0;
  const localCount = channelMap.get("local") ?? 0;
  const channelTotal = Math.max(1, northCount + localCount);
  const northPct = Math.round((northCount / channelTotal) * 100);

  // --- Map routes: project origin/dest cities, serialize to plain props. ---
  const routes: MapRoute[] = activeShipments.map((s) => {
    const origin = cityByName(s.originCity ?? cfg.map.originCity);
    const dest = cityByName(s.destinationCity);
    const destXY = dest
      ? project(dest.lng, dest.lat)
      : project(74.34, 31.55); // fall back to Lahore if unknown (defensive)
    const eta = s.estimatedArrivalAt ? dateShort(s.estimatedArrivalAt) : null;
    return {
      id: s.id,
      originXY: origin ? project(origin.lng, origin.lat) : KARACHI_XY,
      destXY,
      destCity: s.destinationCity,
      status: s.status,
      label: s.destinationCity,
      eta,
      prog: progressFor(s.status, s.departureAt, s.estimatedArrivalAt, now),
    };
  });

  // In-transit list rows (serialized). `progress` drives the thin on-the-road
  // bar; derived from status since shipments carry no explicit % field.
  const shipmentRows = activeShipments.map((s) => ({
    id: s.id,
    status: s.status,
    destination: s.destinationName || s.destinationCity,
    destinationCity: s.destinationCity,
    reference: s.reference,
    eta: s.estimatedArrivalAt ? dateShort(s.estimatedArrivalAt) : null,
    etaHint: etaHint(s.estimatedArrivalAt, now, t),
    progress: shipProgress(s.status),
  }));

  const greeting = greetFor(now, ctx.user.name, t);

  // Live sales overview (trailing 12 months) from the book's invoices.
  const liveSales = computeLiveSales(
    allInvoices.map((i) => ({
      date: i.date,
      totalAmount: Number(i.totalAmount),
      partyId: i.partyId,
    })),
    new Map(parties.map((p) => [p.id, p.name])),
    now,
  );

  return (
    <div className="animate-rise space-y-3.5">
      {/* Page header: serif greeting + new-invoice action. */}
      <div className="mb-1 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[30px] font-semibold leading-tight tracking-[-0.01em] text-ink">
            {greeting}
          </h1>
          <div className="mt-1 text-[13px] text-muted">
            {dateLong(now)} {t("dashboard.header.subtitlePrefix")} {ctx.entityName}{" "}
            {t("dashboard.header.subtitleSuffix")}
          </div>
        </div>
        <PrimaryButton href="/invoices/new" className="shrink-0">
          <span className="text-base leading-none">+</span> {t("dashboard.newInvoice")}
        </PrimaryButton>
      </div>

      {/* Field drafts waiting for review (delivery-portal flow). */}
      {draftCount > 0 && (
        <Link
          href="/invoices?status=draft"
          className="block rounded-xl border px-4 py-3 text-[13px] transition-colors hover:brightness-[0.98]"
          style={{ borderColor: "var(--warn)", background: "var(--warn-bg)", color: "var(--warn)" }}
        >
          <strong>{draftCount} field draft{draftCount === 1 ? "" : "s"}</strong> from the delivery
          login {draftCount === 1 ? "needs" : "need"} review — tap to open the queue.
        </Link>
      )}

      {/* KPI row. */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Kpi
          label={t("dashboard.kpi.receivablesNet")}
          value={pkr(receivablesNet)}
          sub={t("dashboard.kpi.receivablesNetSub")}
        />
        <Kpi
          label={t("dashboard.kpi.supplierPayables")}
          value={pkr(supplierPayables)}
          sub={t("dashboard.kpi.supplierPayablesSub")}
          valueColor="var(--neg)"
        />
        <Kpi
          label={t("dashboard.kpi.netPosition")}
          value={pkr(netPosition)}
          sub={t("dashboard.kpi.netPositionSub")}
          valueColor="var(--accent-deep)"
        />
        {f.banks ? (
          <Kpi label={t("dashboard.kpi.estBankBalance")} value={pkr(estBank)} sub={`${t("dashboard.kpi.estBankBalanceSubPrefix")} ${banks.length} ${t("dashboard.kpi.estBankBalanceSubSuffix")}`} />
        ) : (
          <Kpi label={t("dashboard.kpi.draftsToReview")} value={String(draftCount)} sub={t("dashboard.kpi.draftsToReviewSub")} />
        )}
      </div>

      {/* Live sales overview (trailing 12 months) + imported FY reference. */}
      <SalesReportSection
        monthly={liveSales.monthly}
        topClients={liveSales.topClients}
        total={liveSales.total}
        count={liveSales.count}
      />

      {/* Row: Profit & loss (wide) + cheques-due / channel column. */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="font-serif text-[17px] font-semibold text-ink">{t("dashboard.pnl.title")}</div>
            <div className="text-[11.5px] text-faint2">
              {t("dashboard.pnl.subtitleBase")}{f.expenses ? t("dashboard.pnl.subtitleVsExpenses") : ""}{t("dashboard.pnl.subtitleHover")}
            </div>
          </div>
          <BarChart
            data={barData}
            ariaLabel={t("dashboard.chart.pnlAriaLabel")}
            revenueLabel={t("dashboard.chart.revenue")}
            expensesLabel={t("dashboard.chart.expenses")}
            profitLabel={t("dashboard.chart.profit")}
          />
        </Card>

        <div className="flex flex-col gap-3.5">
          {/* Cheques due (next 24h). */}
          {f.cheques && (
            <Card className="flex-1 p-[18px]">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-serif text-[17px] font-semibold text-ink">{t("dashboard.cheques.title")}</div>
                <span
                  className="inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
                  style={{ background: "var(--neg-bg)", color: "var(--neg)" }}
                >
                  {t("dashboard.cheques.next24h")}
                </span>
              </div>
              {dueCheques.length === 0 ? (
                <p className="text-[13px] text-faint">{t("dashboard.cheques.empty")}</p>
              ) : (
                <Link href="/cheques" className="block">
                  {dueCheques.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2.5 border-b border-row px-0.5 py-2.5 last:border-0 hover:bg-card2"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: "var(--neg)", animation: "pulseRed 2s infinite" }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold text-text">
                          {c.bankAccount.bankName}
                        </div>
                        <div className="text-[11.5px] text-faint">
                          #{c.chequeNumber} · {t("dashboard.cheques.dueLabel")} {c.clearingDue ? dateShort(c.clearingDue) : "—"}
                        </div>
                      </div>
                      <div className="font-mono text-[13px] font-semibold text-text">
                        {pkr(Number(c.amount))}
                      </div>
                    </div>
                  ))}
                </Link>
              )}
            </Card>
          )}

          {/* Invoices by channel (thin split bar). */}
          <Card className="p-[18px]">
            <div className="mb-3 font-serif text-[17px] font-semibold text-ink">
              {t("dashboard.channel.title")}
            </div>
            <div
              className="flex h-3 overflow-hidden rounded-full"
              style={{ background: "var(--row)" }}
            >
              <div style={{ width: `${northPct}%`, background: "var(--accent)" }} />
              <div style={{ width: `${100 - northPct}%`, background: "var(--gold)" }} />
            </div>
            <div className="mt-2.5 flex justify-between text-[11.5px] text-faint">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-[9px] w-[9px] rounded-sm"
                  style={{ background: "var(--accent)" }}
                />{" "}
                {cfg.terminology.channelNorthLabel} · <span className="font-mono">{northCount}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-[9px] w-[9px] rounded-sm"
                  style={{ background: "var(--gold)" }}
                />{" "}
                {cfg.terminology.channelLocalLabel} · <span className="font-mono">{localCount}</span>
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Row: money insight — aging, top debtors, payment mix. */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        {/* Receivables aging. */}
        <Card className="p-[18px]">
          <div className="mb-1 font-serif text-[17px] font-semibold text-ink">
            {t("dashboard.aging.title")}
          </div>
          <div className="mb-3 text-[11.5px] text-faint2">{t("dashboard.aging.subtitle")}</div>
          {agingTotal <= 0 ? (
            <p className="text-[13px] text-faint">{t("dashboard.aging.empty")}</p>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full" style={{ background: "var(--row)" }}>
                {aging.map((b, i) =>
                  b.amount > 0 ? (
                    <div
                      key={b.label}
                      title={`${b.label}: ${pkr(b.amount)}`}
                      style={{ width: `${(b.amount / agingTotal) * 100}%`, background: AGING_COLORS[i] }}
                    />
                  ) : null,
                )}
              </div>
              <div className="mt-3 space-y-1.5">
                {aging.map((b, i) => (
                  <div key={b.label} className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-1.5 text-text">
                      <span className="h-[9px] w-[9px] rounded-sm" style={{ background: AGING_COLORS[i] }} />
                      {b.label}
                      <span className="text-faint">· {b.count} {t("dashboard.aging.invSuffix")}</span>
                    </span>
                    <span className="font-mono text-muted">{pkr(b.amount)}</span>
                  </div>
                ))}
              </div>
              {aging[2].amount + aging[3].amount > 0 && (
                <div className="mt-2.5 text-[11.5px]" style={{ color: "var(--neg)" }}>
                  {pkr(aging[2].amount + aging[3].amount)} {t("dashboard.aging.chaseSuffix")}
                </div>
              )}
            </>
          )}
        </Card>

        {/* Top debtors. */}
        <Card className="p-[18px]">
          <div className="mb-1 font-serif text-[17px] font-semibold text-ink">{t("dashboard.debtors.title")}</div>
          <div className="mb-3 text-[11.5px] text-faint2">{t("dashboard.debtors.subtitle")}</div>
          {debtors.length === 0 ? (
            <p className="text-[13px] text-faint">{t("dashboard.debtors.empty")}</p>
          ) : (
            <div className="space-y-2.5">
              {debtors.map((d) => (
                <Link key={d.partyId} href={`/parties/${d.partyId}`} className="block hover:opacity-80">
                  <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="truncate font-semibold text-text">{d.name}</span>
                    <span className="shrink-0 font-mono text-muted">{pkr(d.balance)}</span>
                  </div>
                  <div className="mt-1 h-[5px] overflow-hidden rounded-full" style={{ background: "var(--row)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(4, (d.balance / maxDebt) * 100)}%`, background: "var(--accent)" }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Payment mix. */}
        <Card className="p-[18px]">
          <div className="mb-1 font-serif text-[17px] font-semibold text-ink">{t("dashboard.mix.title")}</div>
          <div className="mb-3 text-[11.5px] text-faint2">{t("dashboard.mix.subtitle")}</div>
          <Donut
            slices={mixSlices}
            centerLabel={t("dashboard.mix.centerLabel")}
            centerValue={compactMoney(mixTotal)}
            formatValue={(n) => compactMoney(n)}
            emptyLabel={t("dashboard.mix.empty")}
          />
        </Card>
      </div>

      {/* Row: Recent invoices + On the road. */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {/* Recent invoices. */}
        <Card className="p-[18px]">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-serif text-[17px] font-semibold text-ink">{t("dashboard.recentInvoices")}</div>
            <Link
              href="/invoices"
              className="p-1 text-[12px] font-semibold text-accent hover:text-accent-deep"
            >
              {t("dashboard.recent.viewAll")}
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-[13px] text-faint">
              {t("dashboard.recent.empty")}{" "}
              <Link href="/invoices/new" className="text-gold underline hover:text-accent-deep">
                {t("dashboard.recent.createFirst")}
              </Link>
            </p>
          ) : (
            <div>
              {recent.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="flex items-center gap-3 border-b border-row px-0.5 py-2.5 last:border-0 hover:bg-card2"
                >
                  <span className="font-mono text-[12px] text-gold">#{inv.invoiceNumber}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-text">
                      {inv.party.name}
                    </div>
                    <div className="text-[11px] text-faint">{dateShort(inv.date)}</div>
                  </div>
                  <StatusChip status={inv.status} />
                  <div className="w-24 text-right font-mono text-[13px] font-semibold text-text">
                    {pkr(Number(inv.totalAmount))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* On the road (active shipments). */}
        {f.shipments && (
          <Card className="p-[18px]">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-serif text-[17px] font-semibold text-ink">{t("dashboard.onTheRoad")}</div>
              <Link
                href="/shipments"
                className="p-1 text-[12px] font-semibold text-accent hover:text-accent-deep"
              >
                {t("dashboard.road.shipmentsLink")}
              </Link>
            </div>
            {shipmentRows.length === 0 ? (
              <p className="text-[13px] text-faint">
                {t("dashboard.road.empty")}{" "}
                <Link href="/shipments" className="text-gold underline hover:text-accent-deep">
                  {t("dashboard.road.addOne")}
                </Link>
              </p>
            ) : (
              <div>
                {shipmentRows.map((s) => (
                  <Link
                    key={s.id}
                    href="/shipments"
                    className="block border-b border-row px-0.5 py-2.5 last:border-0 hover:bg-card2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 text-[13px] font-semibold text-text">
                        {cfg.map.originCity} → {s.destinationCity}
                      </div>
                      <StatusChip status={s.status} />
                    </div>
                    <div className="mt-2 flex items-center gap-2.5">
                      <div
                        className="h-[3px] flex-1 overflow-hidden rounded-full"
                        style={{ background: "var(--row)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${s.progress}%`, background: shipColor(s.status) }}
                        />
                      </div>
                      <div className="shrink-0 text-[11px] text-faint">
                        {s.eta ? `${t("dashboard.road.etaPrefix")} ${s.eta}` : t("dashboard.road.etaNone")}
                        {s.etaHint ? ` · ${s.etaHint}` : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Shipment tracker map (full width). */}
      {f.shipments && (
        <Card className="p-[18px]">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-serif text-[17px] font-semibold text-ink">{t("dashboard.map.title")}</div>
            <span className="text-[11.5px] text-faint2">{activeShipments.length} {t("dashboard.map.activeSuffix")}</span>
          </div>
          <PakistanMap
            routes={routes}
            originCity={cfg.map.originCity}
            showContextCities={cfg.map.showContextCities}
          />
        </Card>
      )}
    </div>
  );
}

function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

/** Compact money for the donut center/legend: 1.2M / 340K / full below 1000. */
function compactMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}K`;
  return pkr(n);
}

/** Human "in 3 days" / "overdue" hint from an ETA, using a supplied `now`. */
function etaHint(eta: Date | null, now: Date, t: TFn): string | null {
  if (!eta) return null;
  const ms = new Date(eta).getTime() - now.getTime();
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days < 0) return `${Math.abs(days)}d ${t("dashboard.etaHint.overdueSuffix")}`;
  if (days === 0) return t("dashboard.etaHint.today");
  if (days === 1) return t("dashboard.etaHint.tomorrow");
  return `${t("dashboard.etaHint.inPrefix")} ${days}d`;
}

/** Thin on-the-road progress bar width (%) derived from shipment status. */
function shipProgress(status: string): number {
  switch (status) {
    case "preparing":
      return 20;
    case "delayed":
      return 55;
    case "in_transit":
      return 70;
    case "delivered":
      return 100;
    default:
      return 45;
  }
}

/** On-the-road progress-bar color per status (matches the map palette). */
function shipColor(status: string): string {
  switch (status) {
    case "delayed":
      return "var(--neg)";
    case "preparing":
      return "#D9B98A";
    case "delivered":
      return "var(--pos)";
    default:
      return "var(--accent)";
  }
}

/** Time-of-day greeting, personalised with the signed-in user's first name. */
function greetFor(now: Date, name: string, t: TFn): string {
  const first = name.split(" ")[0] || name;
  const h = now.getHours();
  const part =
    h < 12
      ? t("dashboard.greeting.morning")
      : h < 18
        ? t("dashboard.greeting.afternoon")
        : t("dashboard.greeting.evening");
  return `${part}, ${first}`;
}

/** Long human date, e.g. "Wednesday, 1 July 2026". */
function dateLong(d: Date): string {
  return d.toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
