/**
 * Pure grouping/totalling helpers for the bad-debts & disputes ledger. These
 * take plain data (already-serialized numbers) and never read the system clock
 * or hit the DB, so they are deterministic and unit-testable. The server page
 * decides "now" and passes formatted strings down.
 */

export type BadDebtSubCategory = "bad_debt" | "dispute";

/** A serialized bad-debt/dispute row safe to hand to a client component. */
export interface BadDebtRow {
  id: string;
  personName: string;
  amount: number;
  subCategory: BadDebtSubCategory;
  note: string | null;
  /** ISO date string (serialized from Prisma Date). */
  date: string;
  partyId: string | null;
  partyName: string | null;
  invoiceId: string | null;
  invoiceNumber: number | null;
}

/** Per-book totals for the summary cards. */
export interface BadDebtTotals {
  badDebt: number;
  dispute: number;
  grand: number;
}

/** Round to 2dp, killing binary-float dust (matches ledger.ts rounding). */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Sum amounts split by sub-category. Grand total is bad-debt + dispute so it
 * always reconciles with the two parts regardless of any active filter applied
 * upstream (the caller decides which rows to pass in).
 */
export function totalBadDebts(rows: BadDebtRow[]): BadDebtTotals {
  let badDebt = 0;
  let dispute = 0;
  for (const r of rows) {
    if (r.subCategory === "dispute") dispute += r.amount;
    else badDebt += r.amount;
  }
  badDebt = round2(badDebt);
  dispute = round2(dispute);
  return { badDebt, dispute, grand: round2(badDebt + dispute) };
}

/** One sub-category group for the printable summary. */
export interface BadDebtGroup {
  subCategory: BadDebtSubCategory;
  title: string;
  rows: BadDebtRow[];
  subtotal: number;
}

const GROUP_TITLES: Record<BadDebtSubCategory, string> = {
  dispute: "Disputes",
  bad_debt: "Bad debts",
};

/**
 * Group rows into Disputes then Bad debts (that display order is intentional —
 * disputes are the dispute-defense priority), each with its own subtotal.
 * Empty groups are dropped so the print sheet stays tight. Row order within a
 * group is preserved from the input (caller sorts, typically newest-first).
 */
export function groupForPrint(rows: BadDebtRow[]): {
  groups: BadDebtGroup[];
  grandTotal: number;
} {
  const order: BadDebtSubCategory[] = ["dispute", "bad_debt"];
  const groups: BadDebtGroup[] = [];
  let grandTotal = 0;

  for (const sub of order) {
    const groupRows = rows.filter((r) => r.subCategory === sub);
    if (groupRows.length === 0) continue;
    const subtotal = round2(groupRows.reduce((sum, r) => sum + r.amount, 0));
    grandTotal += subtotal;
    groups.push({
      subCategory: sub,
      title: GROUP_TITLES[sub],
      rows: groupRows,
      subtotal,
    });
  }

  return { groups, grandTotal: round2(grandTotal) };
}
