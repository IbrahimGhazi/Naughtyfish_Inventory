import type { CopyFragment } from "./types";

/**
 * Copy for the common area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const commonCopy: CopyFragment = [
  /* ---------------------------- Sidebar ---------------------------- */
  { key: "shell.nav.section.delivery", default: "Delivery", group: "Sidebar", label: "Delivery-portal section label" },
  { key: "shell.nav.section.overview", default: "Overview", group: "Sidebar", label: "‘Overview’ section label" },
  { key: "shell.nav.section.sales", default: "Sales", group: "Sidebar", label: "‘Sales’ section label" },
  { key: "shell.nav.section.operations", default: "Operations", group: "Sidebar", label: "‘Operations’ section label" },
  { key: "shell.nav.section.money", default: "Money", group: "Sidebar", label: "‘Money’ section label" },
  { key: "shell.nav.section.insight", default: "Insight", group: "Sidebar", label: "‘Insight’ section label" },
  { key: "shell.nav.section.productOwner", default: "Product owner", group: "Sidebar", label: "‘Product owner’ section label" },

  { key: "shell.nav.deliveryHome", default: "Home", group: "Sidebar", label: "Delivery-portal ‘Home’ nav item" },
  { key: "shell.nav.deliveryNew", default: "New invoice", group: "Sidebar", label: "Delivery-portal ‘New invoice’ nav item" },
  { key: "shell.nav.deliveryInvoices", default: "My invoices", group: "Sidebar", label: "Delivery-portal ‘My invoices’ nav item" },
  { key: "shell.nav.dashboard", default: "Dashboard", group: "Sidebar", label: "‘Dashboard’ nav item" },
  { key: "shell.nav.invoices", default: "Invoices", group: "Sidebar", label: "‘Invoices’ nav item" },
  { key: "shell.nav.customers", default: "Customers", group: "Sidebar", label: "‘Customers’ nav item" },
  { key: "shell.nav.suppliers", default: "Suppliers", group: "Sidebar", label: "‘Suppliers’ nav item" },
  { key: "shell.nav.shipments", default: "Shipments", group: "Sidebar", label: "‘Shipments’ nav item" },
  { key: "shell.nav.inventory", default: "Inventory", group: "Sidebar", label: "‘Inventory’ nav item" },
  { key: "shell.nav.processes", default: "Processes", group: "Sidebar", label: "‘Processes’ nav item" },
  { key: "shell.nav.cheques", default: "Cheques", group: "Sidebar", label: "‘Cheques’ nav item" },
  { key: "shell.nav.banks", default: "Banks", group: "Sidebar", label: "‘Banks’ nav item" },
  { key: "shell.nav.expenses", default: "Expenses", group: "Sidebar", label: "‘Expenses’ nav item" },
  { key: "shell.nav.storeCosts", default: "Store costs", group: "Sidebar", label: "‘Store costs’ nav item" },
  { key: "shell.nav.reports", default: "Reports", group: "Sidebar", label: "‘Reports’ nav item" },
  { key: "shell.nav.settings", default: "Settings", group: "Sidebar", label: "‘Settings’ nav item" },
  { key: "shell.nav.platform", default: "Platform", group: "Sidebar", label: "‘Platform’ nav item" },

  { key: "shell.sidebar.blackBookPrefix", default: "Black book · ", group: "Sidebar", label: "‘Black book ·’ prefix before tagline (NF book)" },
  { key: "shell.sidebar.lock", default: "Lock", group: "Sidebar", label: "Lock/logout button tooltip" },

  /* ---------------------------- Topbar ----------------------------- */
  { key: "shell.topbar.eyebrow.sales", default: "Sales", group: "Topbar", label: "Sales eyebrow" },
  { key: "shell.topbar.eyebrow.operations", default: "Operations", group: "Topbar", label: "Operations eyebrow" },
  { key: "shell.topbar.eyebrow.money", default: "Money", group: "Topbar", label: "Money eyebrow" },
  { key: "shell.topbar.eyebrow.insight", default: "Insight", group: "Topbar", label: "Insight eyebrow" },
  { key: "shell.topbar.eyebrow.admin", default: "Admin", group: "Topbar", label: "Admin eyebrow" },
  { key: "shell.topbar.eyebrow.productOwner", default: "Product owner", group: "Topbar", label: "Product owner eyebrow" },
  { key: "shell.topbar.eyebrow.delivery", default: "Delivery", group: "Topbar", label: "Delivery eyebrow" },
  { key: "shell.topbar.eyebrow.overview", default: "Overview", group: "Topbar", label: "Overview eyebrow" },

  { key: "shell.topbar.title.newInvoice", default: "New invoice", group: "Topbar", label: "New-invoice page title" },
  { key: "shell.topbar.title.invoiceDetail", default: "Invoice detail", group: "Topbar", label: "Invoice-detail page title" },
  { key: "shell.topbar.title.invoices", default: "Invoices", group: "Topbar", label: "Invoices page title" },
  { key: "shell.topbar.title.partyLedger", default: "Party ledger", group: "Topbar", label: "Party-ledger page title" },
  { key: "shell.topbar.title.customers", default: "Customers", group: "Topbar", label: "Customers page title" },
  { key: "shell.topbar.title.suppliers", default: "Suppliers", group: "Topbar", label: "Suppliers page title" },
  { key: "shell.topbar.title.shipments", default: "Shipments", group: "Topbar", label: "Shipments page title" },
  { key: "shell.topbar.title.inventory", default: "Inventory", group: "Topbar", label: "Inventory page title" },
  { key: "shell.topbar.title.processes", default: "Processes", group: "Topbar", label: "Processes page title" },
  { key: "shell.topbar.title.cheques", default: "Cheques", group: "Topbar", label: "Cheques page title" },
  { key: "shell.topbar.title.banks", default: "Banks", group: "Topbar", label: "Banks page title" },
  { key: "shell.topbar.title.expenses", default: "Expenses", group: "Topbar", label: "Expenses page title" },
  { key: "shell.topbar.title.storeCosts", default: "Store costs", group: "Topbar", label: "Store-costs page title" },
  { key: "shell.topbar.title.badDebts", default: "Bad debts & disputes", group: "Topbar", label: "Bad-debts page title" },
  { key: "shell.topbar.title.weeklyStatement", default: "Weekly statement", group: "Topbar", label: "Weekly-statement page title" },
  { key: "shell.topbar.title.reports", default: "Reports", group: "Topbar", label: "Reports page title" },
  { key: "shell.topbar.title.password", default: "Password", group: "Topbar", label: "Password page title" },
  { key: "shell.topbar.title.settings", default: "Settings", group: "Topbar", label: "Settings page title" },
  { key: "shell.topbar.title.platform", default: "Platform", group: "Topbar", label: "Platform page title" },
  { key: "shell.topbar.title.deliveryNewInvoice", default: "New invoice", group: "Topbar", label: "Delivery new-invoice page title" },
  { key: "shell.topbar.title.deliveryMyInvoices", default: "My invoices", group: "Topbar", label: "Delivery my-invoices page title" },
  { key: "shell.topbar.title.deliveryHome", default: "Home", group: "Topbar", label: "Delivery home page title" },
  { key: "shell.topbar.title.dashboard", default: "Dashboard", group: "Topbar", label: "Dashboard page title" },

  /* -------------------------- Theme toggle ------------------------- */
  { key: "shell.theme.toLightAria", default: "Switch to light mode", group: "Theme toggle", label: "Aria-label when in dark mode" },
  { key: "shell.theme.toDarkAria", default: "Switch to dark mode", group: "Theme toggle", label: "Aria-label when in light mode" },
  { key: "shell.theme.lightTitle", default: "Light mode", group: "Theme toggle", label: "Tooltip when in dark mode" },
  { key: "shell.theme.darkTitle", default: "Dark mode", group: "Theme toggle", label: "Tooltip when in light mode" },

  /* ------------------------------ Login ---------------------------- */
  { key: "shell.login.eyebrow", default: "Open a book", group: "Login", label: "Login form eyebrow" },
  { key: "shell.login.loginId", default: "Login ID", group: "Login", label: "Login-ID field label" },
  { key: "shell.login.password", default: "Password", group: "Login", label: "Password field label" },
  { key: "shell.login.signingIn", default: "Signing in…", group: "Login", label: "Submit button (pending)" },
  { key: "shell.login.submit", default: "Enter the ledger →", group: "Login", label: "Submit button (idle)" },
  { key: "shell.login.devHint", default: "seeded dev logins — admin · accountant · delivery", group: "Login", label: "Dev-logins helper text" },

  /* ---------------------------- Assistant -------------------------- */
  { key: "shell.assistant.suggestion.owesMost", default: "Who owes me the most?", group: "Assistant", label: "Suggested prompt 1" },
  { key: "shell.assistant.suggestion.chequesDue", default: "Cheques due this week", group: "Assistant", label: "Suggested prompt 2" },
  { key: "shell.assistant.suggestion.netPosition", default: "What's my net position?", group: "Assistant", label: "Suggested prompt 3" },
  { key: "shell.assistant.suggestion.pcLahore", default: "PC Lahore ka kitna baaki hai?", group: "Assistant", label: "Suggested prompt 4 (Urdu)" },

  { key: "shell.assistant.tool.getPartyBalance", default: "party balance", group: "Assistant", label: "Tool label: party balance" },
  { key: "shell.assistant.tool.netPosition", default: "net position", group: "Assistant", label: "Tool label: net position" },
  { key: "shell.assistant.tool.topReceivables", default: "receivables", group: "Assistant", label: "Tool label: receivables" },
  { key: "shell.assistant.tool.listPayables", default: "payables", group: "Assistant", label: "Tool label: payables" },
  { key: "shell.assistant.tool.dueCheques", default: "cheques due", group: "Assistant", label: "Tool label: cheques due" },
  { key: "shell.assistant.tool.profitAndLoss", default: "profit & loss", group: "Assistant", label: "Tool label: profit & loss" },
  { key: "shell.assistant.tool.findInvoices", default: "invoices", group: "Assistant", label: "Tool label: invoices" },
  { key: "shell.assistant.tool.inventorySummary", default: "inventory", group: "Assistant", label: "Tool label: inventory" },
  { key: "shell.assistant.tool.activeShipments", default: "shipments", group: "Assistant", label: "Tool label: shipments" },

  { key: "shell.assistant.title", default: "Ask the ledger", group: "Assistant", label: "Assistant panel title" },
  { key: "shell.assistant.subtitlePrefix", default: "Read-only · ", group: "Assistant", label: "Subtitle prefix (before book name)" },
  { key: "shell.assistant.subtitleSuffix", default: " book · answers from your data", group: "Assistant", label: "Subtitle suffix (after book name)" },
  { key: "shell.assistant.closeAria", default: "Close chat", group: "Assistant", label: "Close-panel aria-label" },
  { key: "shell.assistant.intro", default: "Ask about balances, cheques, stock, shipments or profit — in English or Urdu. I read the live ledger; I can't change anything.", group: "Assistant", label: "Empty-state intro paragraph", multiline: true },
  { key: "shell.assistant.fallbackReply", default: "Sorry, I couldn't answer that.", group: "Assistant", label: "Fallback reply when no answer" },
  { key: "shell.assistant.networkError", default: "Network error — please try again.", group: "Assistant", label: "Network-error reply" },
  { key: "shell.assistant.checkedPrefix", default: "checked: ", group: "Assistant", label: "Prefix before checked-tool list" },
  { key: "shell.assistant.inputPlaceholder", default: "Ask a question…", group: "Assistant", label: "Message input placeholder" },
  { key: "shell.assistant.sendAria", default: "Send", group: "Assistant", label: "Send-button aria-label" },
  { key: "shell.assistant.toggleCloseAria", default: "Close assistant", group: "Assistant", label: "Launcher aria-label (open)" },
  { key: "shell.assistant.toggleOpenAria", default: "Ask the ledger", group: "Assistant", label: "Launcher aria-label (closed)" },
];
