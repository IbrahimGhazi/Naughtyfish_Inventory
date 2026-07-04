/* Serializable payloads for client-side PDF generation. Server pages build
 * these and hand them to <SharePdfButton>; the (lazy-loaded) builders render
 * them with jsPDF. Plain JSON only — ISO date strings + numbers. */

export type PdfKind = "invoice" | "statement" | "weekly" | "badDebts";

export interface InvoicePdfLine {
  itemName: string;
  grossKg: number;
  netKg: number;
  glazingPct: number;
  ratePerKg: number;
  cartonCount: number | null;
  packetCount: number | null;
  amount: number;
}

export interface InvoicePdfData {
  businessName: string;
  invoiceNumber: number;
  referenceNumber: string | null;
  dateISO: string;
  channel: string;
  status: string;
  partyName: string;
  partyMeta: string;
  lines: InvoicePdfLine[];
  total: number;
  paid: number;
  balance: number;
  notes: string | null;
}

export interface StatementPdfRow {
  dateISO: string;
  kind: string;
  ref: string;
  meta?: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface StatementPdfData {
  businessName: string;
  partyName: string;
  partyMeta: string;
  asOfISO: string | null;
  opening: number;
  rows: StatementPdfRow[];
  netOutstanding: number;
}

export interface WeeklyPdfRow {
  name: string;
  detail: string;
  outstanding: number;
}

export interface WeeklyPdfData {
  businessName: string;
  fromISO: string;
  toISO: string;
  corporate: WeeklyPdfRow[];
  local: WeeklyPdfRow[];
  suppliers: WeeklyPdfRow[];
  receivablesTotal: number;
  payablesTotal: number;
  net: number;
}

export interface BadDebtsPdfRow {
  dateISO: string;
  name: string;
  invoiceNumber: string | null;
  type: string;
  amount: number;
  note: string | null;
}

export interface BadDebtsPdfData {
  businessName: string;
  rows: BadDebtsPdfRow[];
  badDebtTotal: number;
  disputeTotal: number;
  grandTotal: number;
}

export type PdfPayload =
  | InvoicePdfData
  | StatementPdfData
  | WeeklyPdfData
  | BadDebtsPdfData;
