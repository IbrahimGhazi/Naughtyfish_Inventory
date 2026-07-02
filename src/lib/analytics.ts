/**
 * Pure dashboard-analytics helpers. These take their data AND the reference
 * time/month-list as parameters — they never read the system clock — so they
 * are deterministic and unit-testable. The page/server component decides "now".
 */

/** A row that carries a date and a numeric value we want to bucket by month. */
export interface DatedAmount {
  date: Date | string;
  amount: number;
}

/** One month's revenue / expenses / profit, plus a display label. */
export interface MonthlyPnL {
  /** Zero-padded year-month key, e.g. "2026-07". Stable for sorting/keys. */
  key: string;
  /** Short human label, e.g. "Jul". */
  label: string;
  /** First day of the calendar month (local). */
  monthStart: Date;
  revenue: number;
  expenses: number;
  profit: number;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function ymKey(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

/**
 * Build a list of the last `count` calendar months (oldest → newest), ending at
 * the month containing `reference`. Deterministic: the caller supplies `now`.
 */
export function lastNMonths(reference: Date, count: number): MonthlyPnL[] {
  const out: MonthlyPnL[] = [];
  const y = reference.getFullYear();
  const m = reference.getMonth();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - i, 1);
    out.push({
      key: ymKey(d.getFullYear(), d.getMonth()),
      label: MONTH_LABELS[d.getMonth()],
      monthStart: d,
      revenue: 0,
      expenses: 0,
      profit: 0,
    });
  }
  return out;
}

/**
 * Bucket revenue rows (customer invoices) and expense rows into the given month
 * window and compute profit = revenue − expenses per month. Rows outside the
 * window are ignored. All-zero months are returned as-is (graceful).
 */
export function monthlyPnL(
  revenueRows: DatedAmount[],
  expenseRows: DatedAmount[],
  reference: Date,
  count = 6,
): MonthlyPnL[] {
  const months = lastNMonths(reference, count);
  const byKey = new Map(months.map((mo) => [mo.key, mo]));

  const bucket = (rows: DatedAmount[], field: "revenue" | "expenses") => {
    for (const r of rows) {
      const d = new Date(r.date);
      const key = ymKey(d.getFullYear(), d.getMonth());
      const mo = byKey.get(key);
      if (mo) mo[field] += r.amount;
    }
  };

  bucket(revenueRows, "revenue");
  bucket(expenseRows, "expenses");

  for (const mo of months) {
    mo.profit = mo.revenue - mo.expenses;
  }
  return months;
}

/** A named slice for a breakdown (donut / stacked bar). */
export interface Slice {
  label: string;
  value: number;
}

/* ----------------------------- Receivables aging ----------------------------- */

/** An invoice's outstanding amount + its date, for age-bucketing. */
export interface OpenInvoice {
  date: Date | string;
  total: number;
  paid: number;
}

export interface AgingBucket {
  label: string;
  /** Upper bound in days (inclusive); Infinity for the last bucket. */
  maxDays: number;
  amount: number;
  count: number;
}

/**
 * Bucket unpaid invoice balances by age (days since invoice date): 0–30,
 * 31–60, 61–90, 90+. Payments are attributed per invoice (invoice-linked
 * payments only — the app's payment form links them), so this is the honest
 * per-invoice view rather than FIFO allocation. Fully-paid invoices drop out.
 * Deterministic: caller supplies `now`.
 */
export function agingBuckets(invoices: OpenInvoice[], now: Date): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { label: "0–30d", maxDays: 30, amount: 0, count: 0 },
    { label: "31–60d", maxDays: 60, amount: 0, count: 0 },
    { label: "61–90d", maxDays: 90, amount: 0, count: 0 },
    { label: "90d+", maxDays: Infinity, amount: 0, count: 0 },
  ];
  const DAY = 24 * 60 * 60 * 1000;
  for (const inv of invoices) {
    const due = inv.total - inv.paid;
    if (due <= 0.005) continue;
    const age = Math.max(0, Math.floor((now.getTime() - new Date(inv.date).getTime()) / DAY));
    const b = buckets.find((x) => age <= x.maxDays)!;
    b.amount += due;
    b.count += 1;
  }
  for (const b of buckets) b.amount = Math.round((b.amount + Number.EPSILON) * 100) / 100;
  return buckets;
}

/* ------------------------------- Top debtors ------------------------------- */

export interface DebtorRow {
  partyId: string;
  name: string;
  balance: number;
}

/**
 * Rank customer parties by outstanding balance (opening + invoiced − paid),
 * descending; parties at/below zero are dropped. Pure + deterministic.
 */
export function topDebtors(
  parties: { id: string; name: string; openingBalance: number }[],
  invoicedByParty: Map<string, number>,
  paidByParty: Map<string, number>,
  limit = 5,
): DebtorRow[] {
  return parties
    .map((p) => ({
      partyId: p.id,
      name: p.name,
      balance:
        Math.round(
          (p.openingBalance +
            (invoicedByParty.get(p.id) ?? 0) -
            (paidByParty.get(p.id) ?? 0) +
            Number.EPSILON) * 100,
        ) / 100,
    }))
    .filter((d) => d.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);
}

/**
 * Tally rows into named buckets in a fixed, caller-supplied order (so empty
 * buckets still appear, and the color order is stable). Unknown keys are
 * dropped. Returns slices in `order`; totals of 0 are kept (component decides
 * the empty state).
 */
export function tally(
  rows: { key: string }[],
  order: { key: string; label: string }[],
): Slice[] {
  const counts = new Map<string, number>();
  for (const o of order) counts.set(o.key, 0);
  for (const r of rows) {
    if (counts.has(r.key)) counts.set(r.key, (counts.get(r.key) ?? 0) + 1);
  }
  return order.map((o) => ({ label: o.label, value: counts.get(o.key) ?? 0 }));
}
