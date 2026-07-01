/**
 * Weekly-statement report helpers.
 *
 * The date-range helpers (defaultWeekRange, presetRange) are PURE: they take the
 * current time `now` as an explicit parameter and never read the system clock,
 * so they are deterministic and unit-testable (src/lib/reports.test.ts). The
 * page/server component decides "now".
 *
 * buildWeeklyStatement reuses buildPartyLedger for all as-of balance math — it
 * never re-derives ledger arithmetic.
 */

import { prisma } from "./prisma";
import { buildPartyLedger } from "./ledger";

export type RangePreset = "this_week" | "last_week" | "this_month";

export interface DateRange {
  from: Date;
  to: Date;
}

/** Local midnight (00:00:00.000) of the given date. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Monday 00:00 of the ISO week containing `now`. Sunday counts as the last day
 * of the week, so its Monday is 6 days earlier.
 */
function startOfWeek(now: Date): Date {
  const day = now.getDay(); // 0 = Sun … 6 = Sat
  const daysSinceMonday = (day + 6) % 7; // Mon → 0, Sun → 6
  const monday = startOfDay(now);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday;
}

/**
 * The current week's range: Monday 00:00 → `now` (inclusive of activity up to
 * this moment). Deterministic in `now`.
 */
export function defaultWeekRange(now: Date): DateRange {
  return { from: startOfWeek(now), to: now };
}

/**
 * Resolve a named preset into a concrete { from, to } range, relative to `now`.
 *   this_week  → Monday 00:00 of this week      → now
 *   last_week  → Monday 00:00 of last week      → Sunday 23:59:59.999 of last week
 *   this_month → 1st of this month 00:00        → now
 * Deterministic in `now`.
 */
export function presetRange(preset: RangePreset, now: Date): DateRange {
  switch (preset) {
    case "this_week":
      return defaultWeekRange(now);
    case "last_week": {
      const thisMonday = startOfWeek(now);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSundayEnd = new Date(thisMonday);
      lastSundayEnd.setMilliseconds(lastSundayEnd.getMilliseconds() - 1); // just before this Monday 00:00
      return { from: lastMonday, to: lastSundayEnd };
    }
    case "this_month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { from, to: now };
    }
  }
}

/** One customer/supplier line on the statement, with its open invoices. */
export interface StatementInvoice {
  id: string;
  number: number;
  reference: string | null;
  amount: number;
  date: Date;
}

export interface StatementRow {
  partyId: string;
  name: string;
  /** As-of-toDate net outstanding (positive = they owe us / we owe them). */
  outstanding: number;
  invoices: StatementInvoice[];
}

export interface WeeklyStatement {
  corporate: StatementRow[];
  local: StatementRow[];
  suppliers: StatementRow[];
  receivablesTotal: number;
  payablesTotal: number;
  net: number;
}

/**
 * Build the as-of-`toDate` statement for one book (entity):
 *   - customers with subType "corporate" → corporate receivables
 *   - customers that are local (subType "local" or null) → local receivables
 *   - suppliers → payables (whom we owe)
 * Only parties with a non-zero as-of balance are included. Each customer row
 * also carries that party's open invoices dated on or before `toDate`.
 *
 * As-of balances come straight from buildPartyLedger(...).netOutstanding — this
 * function does NOT re-derive ledger math.
 */
export async function buildWeeklyStatement(
  entityId: string,
  toDate: Date,
): Promise<WeeklyStatement> {
  const parties = await prisma.party.findMany({
    where: { entityId },
    orderBy: { name: "asc" },
  });

  const corporate: StatementRow[] = [];
  const local: StatementRow[] = [];
  const suppliers: StatementRow[] = [];

  for (const party of parties) {
    const { netOutstanding } = await buildPartyLedger(entityId, party.id, toDate);
    if (Math.abs(netOutstanding) < 0.005) continue; // skip settled parties

    const isSupplier = party.partyType === "supplier";

    // Customers list their open invoices "against which invoices" they owe.
    let invoices: StatementInvoice[] = [];
    if (!isSupplier) {
      const invRows = await prisma.invoice.findMany({
        where: { entityId, partyId: party.id, date: { lte: toDate } },
        orderBy: { date: "asc" },
        select: {
          id: true,
          invoiceNumber: true,
          referenceNumber: true,
          totalAmount: true,
          date: true,
        },
      });
      invoices = invRows.map((inv) => ({
        id: inv.id,
        number: inv.invoiceNumber,
        reference: inv.referenceNumber,
        amount: Number(inv.totalAmount),
        date: inv.date,
      }));
    }

    const row: StatementRow = {
      partyId: party.id,
      name: party.name,
      outstanding: netOutstanding,
      invoices,
    };

    if (isSupplier) {
      suppliers.push(row);
    } else if (party.subType === "corporate") {
      corporate.push(row);
    } else {
      local.push(row);
    }
  }

  const sumOutstanding = (rows: StatementRow[]) =>
    rows.reduce((s, r) => s + r.outstanding, 0);

  const receivablesTotal = sumOutstanding(corporate) + sumOutstanding(local);
  const payablesTotal = sumOutstanding(suppliers);

  return {
    corporate,
    local,
    suppliers,
    receivablesTotal,
    payablesTotal,
    net: receivablesTotal - payablesTotal,
  };
}
