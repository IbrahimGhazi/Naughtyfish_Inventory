import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { pkr, dateShort } from "@/lib/format";
import { monthlyPnL } from "@/lib/analytics";
import { cityByName, project } from "@/lib/geo";
import { BarChart, type BarDatum } from "@/components/charts/BarChart";
import { PakistanMap, type MapRoute } from "@/components/PakistanMap";
import { Card, Kpi, StatusChip, PrimaryButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);

  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // next 24h
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    parties,
    payments,
    dueCheques,
    recent,
    banks,
    invoicesForChart,
    expensesForChart,
    activeShipments,
    channelCounts,
  ] = await Promise.all([
    prisma.party.findMany({ where: scope }),
    // All payments in the book, tagged with their party's type so we can split
    // customer receipts from supplier disbursements.
    prisma.payment.findMany({
      where: scope,
      select: { amount: true, party: { select: { partyType: true } } },
    }),
    // Reminder panel: a cheque is "due soon" when its clearingDue OR its
    // reminderDate (set 1 day before due) falls within the next 24h. Union both.
    prisma.cheque.findMany({
      where: {
        ...scope,
        status: { in: ["issued", "pending", "held"] },
        OR: [{ clearingDue: { lte: soon } }, { reminderDate: { lte: soon } }],
      },
      include: { bankAccount: true },
      orderBy: { clearingDue: "asc" },
    }),
    prisma.invoice.findMany({
      where: scope,
      include: { party: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.bankAccount.findMany({ where: scope }),
    // P/L chart source: invoices to CUSTOMER parties in the last 6 months.
    prisma.invoice.findMany({
      where: {
        ...scope,
        date: { gte: sixMonthsAgo },
        party: { partyType: "customer" },
      },
      select: { date: true, totalAmount: true },
    }),
    // P/L chart source: expense entries in the last 6 months.
    prisma.expenseEntry.findMany({
      where: { ...scope, date: { gte: sixMonthsAgo } },
      select: { date: true, amount: true },
    }),
    // Active shipments (not delivered/cancelled) for the map + in-transit list.
    prisma.shipment.findMany({
      where: { ...scope, status: { notIn: ["delivered", "cancelled"] } },
      orderBy: [{ estimatedArrivalAt: "asc" }, { createdAt: "desc" }],
    }),
    // Breakdown: customer invoices by channel (north vs local).
    prisma.invoice.groupBy({
      by: ["channel"],
      where: scope,
      _count: { _all: true },
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
  const customerInvoiceAgg = await prisma.invoice.aggregate({
    where: { ...scope, partyId: { in: [...customerIds] } },
    _sum: { totalAmount: true },
  });
  const customerInvoiceTotal = Number(customerInvoiceAgg._sum.totalAmount ?? 0);
  const receivablesNet = round2(customerOpening + customerInvoiceTotal - paymentsFromCustomers);

  // Supplier payables = Σ supplier opening balances − Σ payments made to suppliers.
  const supplierOpening = parties
    .filter((p) => p.partyType === "supplier")
    .reduce((s, p) => s + Number(p.openingBalance), 0);
  const supplierPayables = round2(supplierOpening - paymentsToSuppliers);

  // Net position includes suppliers (plan §3): receivables_net − supplier_payables.
  const netPosition = round2(receivablesNet - supplierPayables);

  const estBank = banks.reduce((s, b) => s + Number(b.estimatedBalance), 0);

  // --- Profit / Loss chart data (last 6 months). Number()-cast Decimals. ---
  const pnl = monthlyPnL(
    invoicesForChart.map((i) => ({ date: i.date, amount: Number(i.totalAmount) })),
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

  // --- Invoices by channel (north vs local split bar). ---
  const channelMap = new Map(channelCounts.map((c) => [c.channel, c._count._all]));
  const northCount = channelMap.get("north") ?? 0;
  const localCount = channelMap.get("local") ?? 0;
  const channelTotal = Math.max(1, northCount + localCount);
  const northPct = Math.round((northCount / channelTotal) * 100);

  // --- Map routes: project origin/dest cities, serialize to plain props. ---
  const routes: MapRoute[] = activeShipments.map((s) => {
    const origin = cityByName(s.originCity);
    const dest = cityByName(s.destinationCity);
    const destXY = dest
      ? project(dest.lng, dest.lat)
      : project(74.34, 31.55); // fall back to Lahore if unknown (defensive)
    const eta = s.estimatedArrivalAt ? dateShort(s.estimatedArrivalAt) : null;
    return {
      id: s.id,
      originXY: origin ? project(origin.lng, origin.lat) : null,
      destXY,
      status: s.status,
      label: s.destinationCity,
      eta,
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
    etaHint: etaHint(s.estimatedArrivalAt, now),
    progress: shipProgress(s.status),
  }));

  const greeting = greetFor(now, ctx.user.name);

  return (
    <div className="animate-rise space-y-3.5">
      {/* Page header: serif greeting + new-invoice action. */}
      <div className="mb-1 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[30px] font-semibold leading-tight tracking-[-0.01em] text-ink">
            {greeting}
          </h1>
          <div className="mt-1 text-[13px] text-muted">
            {dateLong(now)} — here&apos;s where the {ctx.entityName} book stands.
          </div>
        </div>
        <PrimaryButton href="/invoices/new" className="shrink-0">
          <span className="text-base leading-none">+</span> New invoice
        </PrimaryButton>
      </div>

      {/* KPI row. */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Kpi
          label="Receivables (net)"
          value={pkr(receivablesNet)}
          sub="customer invoices − receipts"
        />
        <Kpi
          label="Supplier payables"
          value={pkr(supplierPayables)}
          sub="owed to suppliers"
          valueColor="var(--neg)"
        />
        <Kpi
          label="Net position"
          value={pkr(netPosition)}
          sub="receivables − payables"
          valueColor="var(--accent-deep)"
        />
        <Kpi label="Est. bank balance" value={pkr(estBank)} sub={`manual · ${banks.length} accounts`} />
      </div>

      {/* Row: Profit & loss (wide) + cheques-due / channel column. */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="font-serif text-[17px] font-semibold text-ink">Profit &amp; loss</div>
            <div className="text-[11.5px] text-faint2">last 6 months · revenue vs expenses</div>
          </div>
          <BarChart data={barData} />
        </Card>

        <div className="flex flex-col gap-3.5">
          {/* Cheques due (next 24h). */}
          <Card className="flex-1 p-[18px]">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-serif text-[17px] font-semibold text-ink">Cheques due</div>
              <span
                className="inline-flex rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
                style={{ background: "var(--neg-bg)", color: "var(--neg)" }}
              >
                next 24h
              </span>
            </div>
            {dueCheques.length === 0 ? (
              <p className="text-[13px] text-faint">No cheques due soon.</p>
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
                        #{c.chequeNumber} · due {c.clearingDue ? dateShort(c.clearingDue) : "—"}
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

          {/* Invoices by channel (thin split bar). */}
          <Card className="p-[18px]">
            <div className="mb-3 font-serif text-[17px] font-semibold text-ink">
              Invoices by channel
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
                North · <span className="font-mono">{northCount}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-[9px] w-[9px] rounded-sm"
                  style={{ background: "var(--gold)" }}
                />{" "}
                Local · <span className="font-mono">{localCount}</span>
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Row: Recent invoices + On the road. */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {/* Recent invoices. */}
        <Card className="p-[18px]">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-serif text-[17px] font-semibold text-ink">Recent invoices</div>
            <Link
              href="/invoices"
              className="p-1 text-[12px] font-semibold text-accent hover:text-accent-deep"
            >
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-[13px] text-faint">
              No invoices yet.{" "}
              <Link href="/invoices/new" className="text-gold underline hover:text-accent-deep">
                Create the first one →
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
        <Card className="p-[18px]">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-serif text-[17px] font-semibold text-ink">On the road</div>
            <Link
              href="/shipments"
              className="p-1 text-[12px] font-semibold text-accent hover:text-accent-deep"
            >
              Shipments →
            </Link>
          </div>
          {shipmentRows.length === 0 ? (
            <p className="text-[13px] text-faint">
              No active shipments.{" "}
              <Link href="/shipments" className="text-gold underline hover:text-accent-deep">
                Add one →
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
                      Karachi → {s.destinationCity}
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
                      {s.eta ? `ETA ${s.eta}` : "ETA —"}
                      {s.etaHint ? ` · ${s.etaHint}` : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Shipment tracker map (full width). */}
      <Card className="p-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-serif text-[17px] font-semibold text-ink">Shipment tracker</div>
          <span className="text-[11.5px] text-faint2">{activeShipments.length} active</span>
        </div>
        <PakistanMap routes={routes} />
      </Card>
    </div>
  );
}

function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

/** Human "in 3 days" / "overdue" hint from an ETA, using a supplied `now`. */
function etaHint(eta: Date | null, now: Date): string | null {
  if (!eta) return null;
  const ms = new Date(eta).getTime() - now.getTime();
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
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
function greetFor(now: Date, name: string): string {
  const first = name.split(" ")[0] || name;
  const h = now.getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
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
