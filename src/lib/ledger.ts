import { prisma } from "./prisma";

export interface LedgerRow {
  date: Date;
  kind: "invoice" | "payment";
  ref: string; // invoice number or payment/cheque note
  debit: number; // invoice amount (party owes us)
  credit: number; // payment received
  balance: number; // running net outstanding (party owes us if positive)
  meta?: string;
}

export interface PartyLedger {
  opening: number;
  rows: LedgerRow[];
  netOutstanding: number;
}

/**
 * Build a party's ledger: opening balance, then invoices (debit) and payments
 * (credit) in date order with a running balance. `asOf` (optional) cuts the
 * ledger at end-of-day for the "as of 27 June, who owes me" report (plan §4.5).
 */
export async function buildPartyLedger(
  entityId: string,
  partyId: string,
  asOf?: Date,
): Promise<PartyLedger> {
  const party = await prisma.party.findFirst({ where: { id: partyId, entityId } });
  if (!party) throw new Error("Party not found in this book.");

  const dateFilter = asOf ? { lte: asOf } : undefined;

  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: { entityId, partyId, ...(dateFilter ? { date: dateFilter } : {}) },
      orderBy: { date: "asc" },
    }),
    prisma.payment.findMany({
      where: { entityId, partyId, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { cheque: true },
      orderBy: { date: "asc" },
    }),
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
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const opening = Number(party.openingBalance);
  let balance = opening;
  for (const row of events) {
    balance += row.debit - row.credit;
    row.balance = Math.round((balance + Number.EPSILON) * 100) / 100;
  }

  return { opening, rows: events, netOutstanding: balance };
}
