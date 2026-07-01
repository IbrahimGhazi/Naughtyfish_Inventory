/**
 * NaughtyFish — payment helpers (pure).
 *
 * Kept framework-free so the outstanding/partial logic can be unit-tested
 * without a database. The single source of truth for invoice math still lives
 * in src/lib/billing.ts — this module only nets recorded payments against an
 * invoice's stored total (never re-derives line math).
 */

/** Sum of amounts already paid against a single invoice (prior payments). */
export function priorPaidAgainstInvoice(payments: Array<{ amount: number }>): number {
  return round2(payments.reduce((sum, p) => sum + p.amount, 0));
}

/** Outstanding on an invoice = stored total − prior payments (floored at 0). */
export function invoiceOutstanding(invoiceTotal: number, priorPaid: number): number {
  return round2(Math.max(0, invoiceTotal - priorPaid));
}

/**
 * A payment linked to an invoice is "partial" when it does not fully clear the
 * still-outstanding amount, i.e. amount < (invoiceTotal − priorPaid).
 */
export function isPartialPayment(
  amount: number,
  invoiceTotal: number,
  priorPaid: number,
): boolean {
  const outstanding = invoiceOutstanding(invoiceTotal, priorPaid);
  return round2(amount) < outstanding;
}

function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}
