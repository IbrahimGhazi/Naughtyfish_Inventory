import type { CopyFragment } from "./types";

/**
 * Copy for the parties area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const partiesCopy: CopyFragment = [
  // Parties list (src/app/parties/page.tsx)
  { key: "parties.list.eyebrow", default: "Sales", group: "Parties", label: "Parties list page eyebrow" },
  { key: "parties.list.title", default: "Parties", group: "Parties", label: "Parties list page title" },
  { key: "parties.list.subtitle", default: "Customers and suppliers — click a party to open its ledger.", group: "Parties", label: "Parties list page subtitle" },
  { key: "parties.list.customers", default: "Customers", group: "Parties", label: "Customers group heading" },
  { key: "parties.list.suppliers", default: "Suppliers", group: "Parties", label: "Suppliers group heading" },
  { key: "parties.list.noCustomers", default: "No customers yet.", group: "Parties", label: "Empty state — no customers" },
  { key: "parties.list.noSuppliers", default: "No suppliers yet.", group: "Parties", label: "Empty state — no suppliers" },

  // Party ledger (src/app/parties/[id]/page.tsx)
  { key: "parties.ledger.backAll", default: "← All parties", group: "Party ledger", label: "Back link to parties list" },
  { key: "parties.ledger.recordPayment", default: "+ Record payment", group: "Party ledger", label: "Record payment button" },
  { key: "parties.ledger.netOutstanding", default: "Net outstanding", group: "Party ledger", label: "Net outstanding summary label" },
  { key: "parties.ledger.openingBalance", default: "opening balance", group: "Party ledger", label: "Opening balance prefix in summary line" },
  { key: "parties.ledger.positiveOwes", default: "positive = party owes us", group: "Party ledger", label: "Summary line — positive owes hint" },
  { key: "parties.ledger.asOfDate", default: "As of date", group: "Party ledger", label: "As-of date filter field label" },
  { key: "parties.ledger.apply", default: "Apply", group: "Party ledger", label: "Apply as-of date button" },
  { key: "parties.ledger.clear", default: "clear", group: "Party ledger", label: "Clear as-of date link" },
  { key: "parties.ledger.colDate", default: "Date", group: "Party ledger", label: "Ledger table column — Date" },
  { key: "parties.ledger.colDetail", default: "Detail", group: "Party ledger", label: "Ledger table column — Detail" },
  { key: "parties.ledger.colDebit", default: "Debit", group: "Party ledger", label: "Ledger table column — Debit" },
  { key: "parties.ledger.colCredit", default: "Credit", group: "Party ledger", label: "Ledger table column — Credit" },
  { key: "parties.ledger.colBalance", default: "Balance", group: "Party ledger", label: "Ledger table column — Balance" },
  { key: "parties.ledger.noActivity", default: "No activity.", group: "Party ledger", label: "Empty state — no ledger activity" },

  // Record payment page (src/app/parties/[id]/payment/page.tsx)
  { key: "parties.payment.title", default: "Record payment", group: "Record payment", label: "Record payment page title" },
  { key: "parties.payment.appearsHint", default: ". Payment appears on the party ledger automatically.", group: "Record payment", label: "Record payment subtitle suffix", multiline: true },

  // Record payment form (src/app/parties/[id]/payment/PaymentForm.tsx)
  { key: "parties.form.paymentType", default: "Payment type", group: "Record payment", label: "Payment type field label" },
  { key: "parties.form.amount", default: "Amount (PKR)", group: "Record payment", label: "Amount field label" },
  { key: "parties.form.date", default: "Date", group: "Record payment", label: "Date field label" },
  { key: "parties.form.dateHint", default: "defaults to today", group: "Record payment", label: "Date field hint" },
  { key: "parties.form.againstInvoice", default: "Against invoice (optional)", group: "Record payment", label: "Against invoice field label" },
  { key: "parties.form.notLinked", default: "— not linked —", group: "Record payment", label: "Against invoice — not linked option" },
  { key: "parties.form.outstanding", default: "outstanding", group: "Record payment", label: "Invoice option — outstanding prefix" },
  { key: "parties.form.noteRequiredCash", default: "Note (required for cash)", group: "Record payment", label: "Cash note field label" },
  { key: "parties.form.noteRequiredCashHint", default: "proof / what this cash is", group: "Record payment", label: "Cash note field hint" },
  { key: "parties.form.precautionaryCash", default: "Precautionary cash (recorded as proof)", group: "Record payment", label: "Precautionary cash checkbox label" },
  { key: "parties.form.promiseOfCheque", default: "Promise of cheque (placeholder)", group: "Record payment", label: "Promise of cheque checkbox label" },
  { key: "parties.form.noteOptional", default: "Note (optional)", group: "Record payment", label: "Optional note field label" },
  { key: "parties.form.chequeNumber", default: "Cheque number", group: "Record payment", label: "Cheque number field label" },
  { key: "parties.form.bankAccount", default: "Bank account", group: "Record payment", label: "Bank account field label" },
  { key: "parties.form.selectBank", default: "Select bank…", group: "Record payment", label: "Bank account — select placeholder option" },
  { key: "parties.form.issueDate", default: "Issue date", group: "Record payment", label: "Issue date field label" },
  { key: "parties.form.clearingDue", default: "Clearing due", group: "Record payment", label: "Clearing due field label" },
  { key: "parties.form.clearingDueHint", default: "reminder set 1 day before", group: "Record payment", label: "Clearing due field hint" },
  { key: "parties.form.recording", default: "Recording…", group: "Record payment", label: "Submit button — recording state" },
  { key: "parties.form.submit", default: "Record payment", group: "Record payment", label: "Submit button — idle state" },
];
