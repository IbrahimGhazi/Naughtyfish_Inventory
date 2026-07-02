import type { CopyFragment } from "./types";

/**
 * Copy for the dashboard area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const dashboardCopy: CopyFragment = [
  { key: "dashboard.recentInvoices", default: "Recent invoices", group: "Dashboard", label: "‘Recent invoices’ card title" },
  { key: "dashboard.onTheRoad", default: "On the road", group: "Dashboard", label: "‘On the road’ card title" },

  // Page header + new-invoice action.
  { key: "dashboard.newInvoice", default: "New invoice", group: "Dashboard", label: "‘New invoice’ header button" },
  { key: "dashboard.header.subtitlePrefix", default: "— here's where the", group: "Dashboard", label: "Header subtitle text before the entity name" },
  { key: "dashboard.header.subtitleSuffix", default: "book stands.", group: "Dashboard", label: "Header subtitle text after the entity name" },

  // KPI cards.
  { key: "dashboard.kpi.receivablesNet", default: "Receivables (net)", group: "Dashboard", label: "KPI label — receivables (net)" },
  { key: "dashboard.kpi.receivablesNetSub", default: "customer invoices − receipts", group: "Dashboard", label: "KPI sub — receivables (net)" },
  { key: "dashboard.kpi.supplierPayables", default: "Supplier payables", group: "Dashboard", label: "KPI label — supplier payables" },
  { key: "dashboard.kpi.supplierPayablesSub", default: "owed to suppliers", group: "Dashboard", label: "KPI sub — supplier payables" },
  { key: "dashboard.kpi.netPosition", default: "Net position", group: "Dashboard", label: "KPI label — net position" },
  { key: "dashboard.kpi.netPositionSub", default: "receivables − payables", group: "Dashboard", label: "KPI sub — net position" },
  { key: "dashboard.kpi.estBankBalance", default: "Est. bank balance", group: "Dashboard", label: "KPI label — estimated bank balance" },
  { key: "dashboard.kpi.estBankBalanceSubPrefix", default: "manual ·", group: "Dashboard", label: "KPI sub prefix — est. bank balance (before account count)" },
  { key: "dashboard.kpi.estBankBalanceSubSuffix", default: "accounts", group: "Dashboard", label: "KPI sub suffix — est. bank balance (after account count)" },
  { key: "dashboard.kpi.draftsToReview", default: "Drafts to review", group: "Dashboard", label: "KPI label — drafts to review" },
  { key: "dashboard.kpi.draftsToReviewSub", default: "from the delivery login", group: "Dashboard", label: "KPI sub — drafts to review" },

  // Profit & loss card.
  { key: "dashboard.pnl.title", default: "Profit & loss", group: "Dashboard", label: "‘Profit & loss’ card title" },
  { key: "dashboard.pnl.subtitleBase", default: "last 6 months · revenue", group: "Dashboard", label: "P&L subtitle — base (shown always)" },
  { key: "dashboard.pnl.subtitleVsExpenses", default: " vs expenses", group: "Dashboard", label: "P&L subtitle — ‘ vs expenses’ (only when expenses feature on)" },
  { key: "dashboard.pnl.subtitleHover", default: " · hover for exact figures", group: "Dashboard", label: "P&L subtitle — hover hint tail" },

  // Cheques-due card.
  { key: "dashboard.cheques.title", default: "Cheques due", group: "Dashboard", label: "‘Cheques due’ card title" },
  { key: "dashboard.cheques.next24h", default: "next 24h", group: "Dashboard", label: "Cheques-due window badge" },
  { key: "dashboard.cheques.empty", default: "No cheques due soon.", group: "Dashboard", label: "Cheques-due empty state" },
  { key: "dashboard.cheques.dueLabel", default: "due", group: "Dashboard", label: "Cheque row ‘due’ label (before date)" },

  // Invoices-by-channel card.
  { key: "dashboard.channel.title", default: "Invoices by channel", group: "Dashboard", label: "‘Invoices by channel’ card title" },

  // Receivables aging card.
  { key: "dashboard.aging.title", default: "Receivables aging", group: "Dashboard", label: "‘Receivables aging’ card title" },
  { key: "dashboard.aging.subtitle", default: "unpaid invoices by age", group: "Dashboard", label: "Receivables-aging subtitle" },
  { key: "dashboard.aging.empty", default: "Nothing outstanding — fully collected.", group: "Dashboard", label: "Receivables-aging empty state" },
  { key: "dashboard.aging.invSuffix", default: "inv", group: "Dashboard", label: "Aging-bucket ‘inv’ count suffix" },
  { key: "dashboard.aging.chaseSuffix", default: "is over 60 days old — chase first.", group: "Dashboard", label: "Aging chase-first warning (after amount)" },

  // Top-debtors card.
  { key: "dashboard.debtors.title", default: "Top debtors", group: "Dashboard", label: "‘Top debtors’ card title" },
  { key: "dashboard.debtors.subtitle", default: "who owes the most right now", group: "Dashboard", label: "Top-debtors subtitle" },
  { key: "dashboard.debtors.empty", default: "No customer owes anything.", group: "Dashboard", label: "Top-debtors empty state" },

  // Payment-mix card.
  { key: "dashboard.mix.title", default: "Payment mix", group: "Dashboard", label: "‘Payment mix’ card title" },
  { key: "dashboard.mix.subtitle", default: "customer receipts · last 90 days", group: "Dashboard", label: "Payment-mix subtitle" },
  { key: "dashboard.mix.centerLabel", default: "received", group: "Dashboard", label: "Payment-mix donut center label" },
  { key: "dashboard.mix.empty", default: "No payments in the last 90 days.", group: "Dashboard", label: "Payment-mix donut empty state" },
  { key: "dashboard.mix.cheque", default: "Cheque", group: "Dashboard", label: "Payment-mix legend — cheque" },
  { key: "dashboard.mix.transfer", default: "Transfer", group: "Dashboard", label: "Payment-mix legend — transfer" },
  { key: "dashboard.mix.cash", default: "Cash", group: "Dashboard", label: "Payment-mix legend — cash" },

  // Recent-invoices card.
  { key: "dashboard.recent.viewAll", default: "View all →", group: "Dashboard", label: "Recent-invoices ‘View all’ link" },
  { key: "dashboard.recent.empty", default: "No invoices yet.", group: "Dashboard", label: "Recent-invoices empty state" },
  { key: "dashboard.recent.createFirst", default: "Create the first one →", group: "Dashboard", label: "Recent-invoices ‘Create the first one’ link" },

  // On-the-road card.
  { key: "dashboard.road.shipmentsLink", default: "Shipments →", group: "Dashboard", label: "On-the-road ‘Shipments’ link" },
  { key: "dashboard.road.empty", default: "No active shipments.", group: "Dashboard", label: "On-the-road empty state" },
  { key: "dashboard.road.addOne", default: "Add one →", group: "Dashboard", label: "On-the-road ‘Add one’ link" },
  { key: "dashboard.road.etaPrefix", default: "ETA", group: "Dashboard", label: "On-the-road ETA prefix" },
  { key: "dashboard.road.etaNone", default: "ETA —", group: "Dashboard", label: "On-the-road ETA placeholder (no date)" },

  // Shipment-tracker map card.
  { key: "dashboard.map.title", default: "Shipment tracker", group: "Dashboard", label: "‘Shipment tracker’ card title" },
  { key: "dashboard.map.activeSuffix", default: "active", group: "Dashboard", label: "Shipment-tracker active-count suffix" },

  // ETA hints (relative day labels).
  { key: "dashboard.etaHint.overdueSuffix", default: "overdue", group: "Dashboard", label: "ETA hint — ‘Nd overdue’ suffix" },
  { key: "dashboard.etaHint.today", default: "today", group: "Dashboard", label: "ETA hint — today" },
  { key: "dashboard.etaHint.tomorrow", default: "tomorrow", group: "Dashboard", label: "ETA hint — tomorrow" },
  { key: "dashboard.etaHint.inPrefix", default: "in", group: "Dashboard", label: "ETA hint — ‘in Nd’ prefix" },

  // Greeting.
  { key: "dashboard.greeting.morning", default: "Good morning", group: "Dashboard", label: "Greeting — morning" },
  { key: "dashboard.greeting.afternoon", default: "Good afternoon", group: "Dashboard", label: "Greeting — afternoon" },
  { key: "dashboard.greeting.evening", default: "Good evening", group: "Dashboard", label: "Greeting — evening" },

  // Profit & loss bar chart.
  { key: "dashboard.chart.pnlAriaLabel", default: "Revenue, expenses and profit by month", group: "Dashboard", label: "P&L chart aria-label" },
  { key: "dashboard.chart.revenue", default: "Revenue", group: "Dashboard", label: "P&L chart legend — revenue" },
  { key: "dashboard.chart.expenses", default: "Expenses", group: "Dashboard", label: "P&L chart legend — expenses" },
  { key: "dashboard.chart.profit", default: "Profit", group: "Dashboard", label: "P&L chart legend — profit" },
];
