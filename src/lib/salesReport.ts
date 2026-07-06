/**
 * SeaStar Impex — annual sales report, FY 2025–26 (imported from the owner's
 * "SEASTAR IMPEX SALES REPORT 2025-2026.xlsx"). Static historical figures shown
 * on the dashboard; independent of the live ledger. Amounts in PKR.
 *
 * Reconciled: the monthly totals and the 456 invoice rows both sum to the same
 * grand total (153,358,464).
 */

export interface MonthlySales {
  month: string; // e.g. "Jul"
  year: number;
  amount: number;
}

export interface ClientSales {
  name: string;
  amount: number;
}

export const SALES_FY_LABEL = "FY 2025–26";

export const SALES_MONTHLY: MonthlySales[] = [
  { month: "Jul", year: 2025, amount: 13_908_789 },
  { month: "Aug", year: 2025, amount: 10_639_535 },
  { month: "Sep", year: 2025, amount: 16_857_072 },
  { month: "Oct", year: 2025, amount: 15_682_648 },
  { month: "Nov", year: 2025, amount: 15_309_074 },
  { month: "Dec", year: 2025, amount: 21_741_831 },
  { month: "Jan", year: 2026, amount: 12_326_992 },
  { month: "Feb", year: 2026, amount: 15_459_307 },
  { month: "Mar", year: 2026, amount: 12_162_002 },
  { month: "Apr", year: 2026, amount: 10_300_509 },
  { month: "May", year: 2026, amount: 8_970_705 },
  { month: "Jun", year: 2026, amount: 0 },
];

export const SALES_TOP_CLIENTS: ClientSales[] = [
  { name: "PC Lahore", amount: 45_040_585 },
  { name: "Marriott Islamabad", amount: 28_339_231 },
  { name: "PC Karachi", amount: 23_579_547 },
  { name: "PC Bhurban", amount: 18_405_009 },
  { name: "PC Rawalpindi", amount: 10_634_812 },
  { name: "Marriott Karachi", amount: 9_465_877 },
  { name: "Double Tree Hilton", amount: 6_561_700 },
  { name: "PC Malam Jabba", amount: 5_472_675 },
  { name: "Islamabad Club", amount: 2_073_839 },
  { name: "PC Muzaffarabad", amount: 2_013_989 },
  { name: "Dampukht Lahore", amount: 1_559_200 },
  { name: "Cecil Murree", amount: 212_000 },
];

export const SALES_GRAND_TOTAL = 153_358_464;
export const SALES_INVOICE_COUNT = 456;

/* --------------------------- live computation --------------------------- */

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface LiveSales {
  monthly: MonthlySales[];
  topClients: ClientSales[];
  total: number;
  count: number;
}

/**
 * Aggregate real invoices into the same shape the sales section renders:
 * a trailing `months`-month sales trend + top clients by invoiced amount.
 * Pure — the caller passes invoices, a partyId→name map and "now".
 */
export function computeLiveSales(
  invoices: { date: Date; totalAmount: number; partyId: string }[],
  partyNames: Map<string, string>,
  now: Date,
  months = 12,
): LiveSales {
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const monthly: MonthlySales[] = [];
  const bucketIndex = new Map<string, number>();
  const key = (y: number, m: number) => `${y}-${m}`;
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    monthly.push({ month: MONTH_ABBR[d.getMonth()], year: d.getFullYear(), amount: 0 });
    bucketIndex.set(key(d.getFullYear(), d.getMonth()), i);
  }

  const clientTotals = new Map<string, number>();
  let total = 0;
  let count = 0;
  for (const inv of invoices) {
    const d = new Date(inv.date);
    if (d < start) continue;
    const bi = bucketIndex.get(key(d.getFullYear(), d.getMonth()));
    if (bi === undefined) continue;
    const amt = Number(inv.totalAmount) || 0;
    monthly[bi].amount += amt;
    total += amt;
    count += 1;
    const name = partyNames.get(inv.partyId) ?? "—";
    clientTotals.set(name, (clientTotals.get(name) ?? 0) + amt);
  }

  const topClients = [...clientTotals.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 12);

  return { monthly, topClients, total, count };
}
