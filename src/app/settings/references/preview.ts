import { formatReference } from "../../../lib/reference";

/**
 * The NEXT reference that a series would emit. Invoicing bumps currentNumber
 * before formatting (see invoices/actions.ts: `nextNum = currentNumber + 1`),
 * so the preview shows currentNumber + 1 — what the owner will actually see on
 * the next invoice. Pure + tested.
 */
export function nextReferencePreview(
  prefix: string,
  currentNumber: number,
  digitWidth: number,
): string {
  const width = Number.isFinite(digitWidth) && digitWidth > 0 ? digitWidth : 1;
  const current = Number.isFinite(currentNumber) ? currentNumber : 0;
  return formatReference(prefix, current + 1, width);
}
