import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { pkr, dateShort } from "@/lib/format";
import { monthlyPnL, tally } from "@/lib/analytics";
import { cityByName, project } from "@/lib/geo";
import { BarChart, type BarDatum } from "@/components/charts/BarChart";
import { Donut, type DonutSlice } from "@/components/charts/Donut";
import { PakistanMap, type MapRoute } from "@/components/PakistanMap";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);

  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // next 24h
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    invoiceCount,
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
    prisma.invoice.count({ where: scope }),
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
    // Breakdown donut: customer invoices by channel (north vs local).
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

  // Receivables (net) = Σ customer invoice totals − Σ payments from customers.
  const customerIds = new Set(parties.filter((p) => p.partyType === "customer").map((p) => p.id));
  const customerInvoiceAgg = await prisma.invoice.aggregate({
    where: { ...scope, partyId: { in: [...customerIds] } },
    _sum: { totalAmount: true },
  });
  const customerInvoiceTotal = Number(customerInvoiceAgg._sum.totalAmount ?? 0);
  const receivablesNet = round2(customerInvoiceTotal - paymentsFromCustomers);

  // Supplier payables = Σ supplier opening balances − Σ payments made to suppliers.
  const supplierOpening = parties
    .filter((p) => p.partyType === "supplier")
    .reduce((s, p) => s + Number(p.openingBalance), 0);
  const supplierPayables = round2(supplierOpening - paymentsToSuppliers);

  // Net position includes suppliers (plan §3): receivables_net − supplier_payables.
  const netPosition = round2(receivablesNet - supplierPayables);

  const supplierCount = parties.filter((p) => p.partyType === "supplier").length;
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

  // --- Breakdown donut: invoices by channel. ---
  const channelMap = new Map(channelCounts.map((c) => [c.channel, c._count._all]));
  const northCount = channelMap.get("north") ?? 0;
  const localCount = channelMap.get("local") ?? 0;
  const channelSlices: DonutSlice[] = [
    {
      label: "North",
      value: northCount,
      fill: "fill-cyan-500 dark:fill-cyan-400",
      swatch: "bg-cyan-500 dark:bg-cyan-400",
      hex: "#06b6d4",
    },
    {
      label: "Local",
      value: localCount,
      fill: "fill-violet-500 dark:fill-violet-400",
      swatch: "bg-violet-500 dark:bg-violet-400",
      hex: "#8b5cf6",
    },
  ];

  // --- Shipment status donut (secondary breakdown) using tally() ---
  const shipmentStatusSlices = buildShipmentSlices(
    tally(
      activeShipments.map((s) => ({ key: s.status })),
      [
        { key: "in_transit", label: "In transit" },
        { key: "preparing", label: "Preparing" },
        { key: "delayed", label: "Delayed" },
      ],
    ),
  );

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

  // In-transit list rows (serialized).
  const shipmentRows = activeShipments.map((s) => ({
    id: s.id,
    status: s.status,
    destination: s.destinationName || s.destinationCity,
    destinationCity: s.destinationCity,
    reference: s.reference,
    eta: s.estimatedArrivalAt ? dateShort(s.estimatedArrivalAt) : null,
    etaHint: etaHint(s.estimatedArrivalAt, now),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Link
          href="/invoices/new"
          className="rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800"
        >
          + New Invoice
        </Link>
      </div>

      {/* KPI row. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Invoices" value={String(invoiceCount)} />
        <Stat
          label="Receivables (net)"
          value={pkr(receivablesNet)}
          sub="customer invoices − receipts"
        />
        <Stat
          label="Net position"
          value={pkr(netPosition)}
          sub="receivables − supplier payables"
        />
        <Stat label="Est. bank balance" value={pkr(estBank)} sub="manual" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Parties" value={`${parties.length}`} sub={`${supplierCount} suppliers`} />
        <Stat label="Supplier payables" value={pkr(supplierPayables)} sub="owed to suppliers" />
      </div>

      {/* Charts row: P/L (wide) + breakdown (narrow). */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>Profit / Loss · last 6 months</CardHeader>
          <BarChart data={barData} />
        </Card>
        <Card>
          <CardHeader>Invoices by channel</CardHeader>
          <Donut
            slices={channelSlices}
            centerLabel="invoices"
            emptyLabel="No invoices yet"
          />
          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Active shipments by status
            </h3>
            <Donut
              slices={shipmentStatusSlices}
              centerLabel="active"
              emptyLabel="No active shipments"
            />
          </div>
        </Card>
      </div>

      {/* Shipment tracker map (full width). */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardHeader className="mb-0">Shipment tracker</CardHeader>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {activeShipments.length} active
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PakistanMap routes={routes} />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              In transit
            </h3>
            {shipmentRows.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                No active shipments.{" "}
                <Link href="/shipments" className="text-cyan-700 underline dark:text-cyan-400">
                  Add one →
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {shipmentRows.map((s) => (
                  <li key={s.id} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">{s.destination}</span>
                      <ShipmentBadge status={s.status} />
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{s.reference ?? "—"}</span>
                      <span>
                        {s.eta ? `ETA ${s.eta}` : "ETA —"}
                        {s.etaHint && (
                          <span className="ml-1 text-slate-400 dark:text-slate-500">
                            · {s.etaHint}
                          </span>
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {/* Cheque reminders — plan §4.4: warn ~1 day before a cheque falls due. */}
      <Card>
        <CardHeader>⏰ Cheques due soon</CardHeader>
        {dueCheques.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No cheques due soon.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {dueCheques.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs uppercase ${
                      c.direction === "incoming"
                        ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
                        : "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                    }`}
                  >
                    {c.direction}
                  </span>
                  Cheque <span className="font-mono">{c.chequeNumber}</span> · {c.bankAccount.bankName}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {pkr(Number(c.amount))} · due {c.clearingDue ? dateShort(c.clearingDue) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Recent invoices. */}
      <Card>
        <CardHeader>Recent invoices</CardHeader>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No invoices yet.{" "}
            <Link href="/invoices/new" className="text-cyan-700 underline dark:text-cyan-400">
              Create the first one →
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {recent.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between py-2">
                <Link
                  href={`/parties/${inv.partyId}`}
                  className="hover:text-cyan-700 dark:hover:text-cyan-400"
                >
                  #{inv.invoiceNumber} · {inv.party.name}
                </Link>
                <span className="text-slate-500 dark:text-slate-400">
                  <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase dark:bg-slate-800 dark:text-slate-300">
                    {inv.channel}
                  </span>
                  {pkr(Number(inv.totalAmount))}
                </span>
              </li>
            ))}
          </ul>
        )}
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

/** Map shipment tally slices onto the map's status colors for consistency. */
function buildShipmentSlices(
  slices: { label: string; value: number }[],
): DonutSlice[] {
  const palette: Record<string, { fill: string; swatch: string; hex: string }> = {
    "In transit": {
      fill: "fill-cyan-500 dark:fill-cyan-400",
      swatch: "bg-cyan-500 dark:bg-cyan-400",
      hex: "#06b6d4",
    },
    Preparing: {
      fill: "fill-slate-400 dark:fill-slate-500",
      swatch: "bg-slate-400 dark:bg-slate-500",
      hex: "#94a3b8",
    },
    Delayed: {
      fill: "fill-amber-500 dark:fill-amber-400",
      swatch: "bg-amber-500 dark:bg-amber-400",
      hex: "#f59e0b",
    },
  };
  return slices.map((s) => ({
    label: s.label,
    value: s.value,
    fill: palette[s.label]?.fill ?? "fill-slate-400 dark:fill-slate-500",
    swatch: palette[s.label]?.swatch ?? "bg-slate-400 dark:bg-slate-500",
    hex: palette[s.label]?.hex ?? "#94a3b8",
  }));
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </section>
  );
}

function CardHeader({ children, className = "mb-3" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-sm font-semibold text-slate-700 dark:text-slate-200 ${className}`}>
      {children}
    </h2>
  );
}

function ShipmentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    in_transit: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    preparing: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    delayed: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    delivered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  };
  const label = status.replace("_", " ");
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-xs uppercase ${
        styles[status] ?? styles.preparing
      }`}
    >
      {label}
    </span>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-slate-400 dark:text-slate-500">{sub}</div>}
    </div>
  );
}
