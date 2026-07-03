import { prisma } from "./prisma";

export interface LedgerRow {
  date: Date;
  kind: "invoice" | "payment" | "purchase";
  ref: string; // invoice/purchase number or payment/cheque note
  debit: number; // charge: invoice (customer owes us) / purchase (we owe supplier)
  credit: number; // payment
  balance: number; // running net outstanding (positive = owed, in the party's direction)
  meta?: string;
}

export interface PartyLedger {
  opening: number;
  rows: LedgerRow[];
  netOutstanding: number;
}

/**
 * Build a party's ledger: opening balance, then charges (debit: customer
 * invoices / supplier purchases) and payments (credit) in date order with a
 * running balance. Positive balance = outstanding in the party's direction
 * (customer owes us / we owe the supplier). `asOf` (optional) cuts the ledger
 * at end-of-day for the "as of 27 June, who owes me" report (plan §4.5).
 */
export async function buildPartyLedger(
  entityId: string,
  partyId: string,
  asOf?: Date,
  opts?: {
    /** Set false for roles WITHOUT the purchases page grant — purchase rows
     *  (and their debits) are then excluded so the module stays unreadable
     *  through party pages. The balance shown is partial for such roles. */
    includePurchases?: boolean;
  },
): Promise<PartyLedger> {
  const includePurchases = opts?.includePurchases ?? true;
  const party = await prisma.party.findFirst({ where: { id: partyId, entityId } });
  if (!party) throw new Error("Party not found in this book.");

  const dateFilter = asOf ? { lte: asOf } : undefined;

  const [invoices, payments, purchases] = await Promise.all([
    prisma.invoice.findMany({
      where: { entityId, partyId, ...(dateFilter ? { date: dateFilter } : {}) },
      orderBy: { date: "asc" },
    }),
    prisma.payment.findMany({
      where: { entityId, partyId, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { cheque: true },
      orderBy: { date: "asc" },
    }),
    includePurchases
      ? prisma.purchase.findMany({
          where: { entityId, partyId, ...(dateFilter ? { date: dateFilter } : {}) },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const events: LedgerRow[] = [
    ...invoices.map((inv) => ({
      date: inv.date,
      kind: "invoice" as const,
      ref: `#${inv.invoiceNumber}${inv.referenceNumber ? ` · ${inv.referenceNumber}` : ""}`,
      debit: Number(inv.totalAmount),
      credit: 0,
      balance: 0,
      meta: inv.channel,
    })),
    // A purchase charges the ledger in the supplier's direction (we owe more).
    ...purchases.map((pur) => ({
      date: pur.date,
      kind: "purchase" as const,
      ref: `${pur.reference}${pur.supplierBillNo ? ` · bill ${pur.supplierBillNo}` : ""}`,
      debit: Number(pur.totalAmount),
      credit: 0,
      balance: 0,
      meta: pur.notes ?? undefined,
    })),
    ...payments.map((p) => {
      const amt = Number(p.amount);
      const baseRef =
        p.type === "cheque" && p.cheque
          ? `Cheque ${p.cheque.chequeNumber}`
          : p.type === "cash"
            ? `Cash${p.promiseOfCheque ? " (promise of cheque)" : ""}`
            : "Transfer";
      return {
        date: p.date,
        kind: "payment" as const,
        // Negative payments are append-only reversals (e.g. a bounced cheque):
        // shown as a debit so the running balance visibly climbs back up.
        ref: amt < 0 ? `Reversal — ${baseRef}` : baseRef,
        debit: amt < 0 ? -amt : 0,
        credit: amt > 0 ? amt : 0,
        balance: 0,
        meta: p.note ?? undefined,
      };
    }),
  ].sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      // Same-timestamp tiebreak: charges (invoice/purchase) before payments,
      // so a same-day settlement never renders as a prepayment.
      (a.kind === "payment" ? 1 : 0) - (b.kind === "payment" ? 1 : 0),
  );

  const opening = Number(party.openingBalance);
  let balance = opening;
  for (const row of events) {
    balance += row.debit - row.credit;
    row.balance = Math.round((balance + Number.EPSILON) * 100) / 100;
  }

  return { opening, rows: events, netOutstanding: balance };
}
