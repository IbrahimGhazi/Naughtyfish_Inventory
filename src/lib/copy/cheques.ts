import type { CopyFragment } from "./types";

/**
 * Copy for the cheques area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const chequesCopy: CopyFragment = [
  { key: "cheques.eyebrow", default: "Money", group: "Cheques", label: "Page header eyebrow" },
  { key: "cheques.title", default: "Cheques", group: "Cheques", label: "Page title" },
  { key: "cheques.subtitle", default: "Click a status action to move a cheque along — pending → cleared.", group: "Cheques", label: "Page subtitle", multiline: true },

  { key: "cheques.statAwaiting", default: "Awaiting clearance", group: "Cheques", label: "‘Awaiting clearance’ stat card label" },
  { key: "cheques.statDueSoon", default: "Due in 24 hours", group: "Cheques", label: "‘Due in 24 hours’ stat card label" },
  { key: "cheques.statClearedWeek", default: "Cleared this week", group: "Cheques", label: "‘Cleared this week’ stat card label" },

  { key: "cheques.tabAll", default: "All", group: "Cheques", label: "‘All’ status filter tab label" },

  { key: "cheques.colCheque", default: "Cheque", group: "Cheques", label: "Table column header: Cheque" },
  { key: "cheques.colRecipient", default: "Recipient", group: "Cheques", label: "Table column header: Recipient" },
  { key: "cheques.colClearingDue", default: "Clearing due", group: "Cheques", label: "Table column header: Clearing due" },
  { key: "cheques.colStatus", default: "Status", group: "Cheques", label: "Table column header: Status" },
  { key: "cheques.colAmount", default: "Amount", group: "Cheques", label: "Table column header: Amount" },
  { key: "cheques.colAdvance", default: "Advance", group: "Cheques", label: "Table column header: Advance" },

  { key: "cheques.emptyState", default: "No cheques.", group: "Cheques", label: "Empty-state message when no cheques" },
  { key: "cheques.dueSoonChip", default: "due soon", group: "Cheques", label: "‘due soon’ row chip" },

  { key: "cheques.newOutgoingTitle", default: "New outgoing cheque", group: "Cheques", label: "‘New outgoing cheque’ form heading" },
  { key: "cheques.newOutgoingDesc", default: 'Record a cheque NF hands onward to a party — the recipient is the "given to whom" record.', group: "Cheques", label: "‘New outgoing cheque’ form description", multiline: true },
  { key: "cheques.addBankPrefix", default: "Add a bank account first on the", group: "Cheques", label: "No-banks notice, text before Banks link" },
  { key: "cheques.addBankLink", default: "Banks", group: "Cheques", label: "No-banks notice, Banks link text" },
  { key: "cheques.addBankSuffix", default: "page.", group: "Cheques", label: "No-banks notice, text after Banks link" },

  { key: "cheques.actionMarkCleared", default: "Mark cleared", group: "Cheques", label: "Row status action: mark cleared" },
  { key: "cheques.actionHold", default: "Hold", group: "Cheques", label: "Row status action: hold" },
  { key: "cheques.actionBounced", default: "Bounced", group: "Cheques", label: "Row status action: bounced" },

  { key: "cheques.fieldChequeNumber", default: "Cheque number", group: "Cheques", label: "Outgoing form field label: Cheque number" },
  { key: "cheques.fieldBankAccount", default: "Bank account", group: "Cheques", label: "Outgoing form field label: Bank account" },
  { key: "cheques.fieldAmount", default: "Amount (PKR)", group: "Cheques", label: "Outgoing form field label: Amount (PKR)" },
  { key: "cheques.fieldRecipient", default: "Recipient (handed to)", group: "Cheques", label: "Outgoing form field label: Recipient (handed to)" },
  { key: "cheques.fieldIssueDate", default: "Issue date", group: "Cheques", label: "Outgoing form field label: Issue date" },
  { key: "cheques.fieldClearingDue", default: "Clearing due", group: "Cheques", label: "Outgoing form field label: Clearing due" },
  { key: "cheques.fieldClearingDueHint", default: "reminder 1 day before", group: "Cheques", label: "Outgoing form field hint: Clearing due" },

  { key: "cheques.selectBankPlaceholder", default: "Select bank…", group: "Cheques", label: "Bank select placeholder option" },
  { key: "cheques.submitSaving", default: "Saving…", group: "Cheques", label: "Outgoing submit button, saving state" },
  { key: "cheques.submitAdd", default: "Add outgoing cheque", group: "Cheques", label: "Outgoing submit button, idle state" },
];
