import type { CopyFragment } from "./types";

/**
 * Copy for the delivery area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const deliveryCopy: CopyFragment = [
  // Delivery home
  {
    key: "delivery.home.greeting",
    default: "Salaam,",
    group: "Delivery Home",
    label: "Greeting before the user's first name",
  },
  {
    key: "delivery.home.subtitle",
    default: "Enter the invoice, print it, and snap a photo of the delivered package.",
    group: "Delivery Home",
    label: "Page subtitle",
    multiline: true,
  },
  {
    key: "delivery.home.newInvoiceTitle",
    default: "New invoice",
    group: "Delivery Home",
    label: "‘New invoice’ big action title",
  },
  {
    key: "delivery.home.newInvoiceHint",
    default: "goes to office for review",
    group: "Delivery Home",
    label: "‘New invoice’ big action hint",
  },
  {
    key: "delivery.home.myInvoicesTitle",
    default: "My invoices",
    group: "Delivery Home",
    label: "‘My invoices’ big action title",
  },
  {
    key: "delivery.home.myInvoicesHint",
    default: "view · print · add photo",
    group: "Delivery Home",
    label: "‘My invoices’ big action hint",
  },
  {
    key: "delivery.home.pendingReviewSuffix",
    default: "awaiting office approval.",
    group: "Delivery Home",
    label: "Pending-review banner suffix (after the count)",
  },
  {
    key: "delivery.home.recentHeading",
    default: "Recent",
    group: "Delivery Home",
    label: "Recent invoices card heading",
  },
  {
    key: "delivery.home.allMyInvoicesLink",
    default: "All my invoices →",
    group: "Delivery Home",
    label: "Link to full invoice list",
  },
  {
    key: "delivery.home.emptyPrefix",
    default: "Nothing yet — tap",
    group: "Delivery Home",
    label: "Empty-state message prefix (before ‘New invoice’)",
  },
  {
    key: "delivery.home.emptyAction",
    default: "New invoice",
    group: "Delivery Home",
    label: "Empty-state message bold action word",
  },
  {
    key: "delivery.home.emptySuffix",
    default: "after your first delivery.",
    group: "Delivery Home",
    label: "Empty-state message suffix (after ‘New invoice’)",
  },
  {
    key: "delivery.home.photoAttachedTitle",
    default: "photo attached",
    group: "Delivery Home",
    label: "Photo-attached icon tooltip",
  },
  {
    key: "delivery.home.awaitingReviewChip",
    default: "awaiting review",
    group: "Delivery Home",
    label: "Draft status chip label",
  },

  // Delivery — New invoice
  {
    key: "delivery.new.back",
    default: "← Delivery home",
    group: "Delivery — New Invoice",
    label: "Back link to delivery home",
  },
  {
    key: "delivery.new.eyebrow",
    default: "Delivery",
    group: "Delivery — New Invoice",
    label: "Page header eyebrow",
  },
  {
    key: "delivery.new.title",
    default: "New invoice",
    group: "Delivery — New Invoice",
    label: "Page title",
  },
  {
    key: "delivery.new.subtitle",
    default:
      "Fill it exactly like the paper slip. It goes to the office as a draft for approval — you can print it and attach the package photo right away.",
    group: "Delivery — New Invoice",
    label: "Page subtitle",
    multiline: true,
  },

  // Delivery — My invoices
  {
    key: "delivery.invoices.back",
    default: "← Delivery home",
    group: "Delivery — My Invoices",
    label: "Back link to delivery home",
  },
  {
    key: "delivery.invoices.eyebrow",
    default: "Delivery",
    group: "Delivery — My Invoices",
    label: "Page header eyebrow",
  },
  {
    key: "delivery.invoices.title",
    default: "My invoices",
    group: "Delivery — My Invoices",
    label: "Page title",
  },
  {
    key: "delivery.invoices.subtitle",
    default: "Only invoices you entered. Open one to print it or attach the delivered-package photo.",
    group: "Delivery — My Invoices",
    label: "Page subtitle",
    multiline: true,
  },
  {
    key: "delivery.invoices.newInvoiceButton",
    default: "New invoice",
    group: "Delivery — My Invoices",
    label: "‘New invoice’ header action button",
  },
  {
    key: "delivery.invoices.empty",
    default: "No invoices yet.",
    group: "Delivery — My Invoices",
    label: "Empty-state message",
  },
  {
    key: "delivery.invoices.colInvoice",
    default: "Invoice",
    group: "Delivery — My Invoices",
    label: "Table column header",
  },
  {
    key: "delivery.invoices.colParty",
    default: "Party",
    group: "Delivery — My Invoices",
    label: "Table column header",
  },
  {
    key: "delivery.invoices.colDate",
    default: "Date",
    group: "Delivery — My Invoices",
    label: "Table column header",
  },
  {
    key: "delivery.invoices.colStatus",
    default: "Status",
    group: "Delivery — My Invoices",
    label: "Table column header",
  },
  {
    key: "delivery.invoices.colPhoto",
    default: "Photo",
    group: "Delivery — My Invoices",
    label: "Table column header",
  },
  {
    key: "delivery.invoices.colTotal",
    default: "Total",
    group: "Delivery — My Invoices",
    label: "Table column header (right-aligned)",
  },
  {
    key: "delivery.invoices.awaitingReviewChip",
    default: "awaiting review",
    group: "Delivery — My Invoices",
    label: "Draft status chip label",
  },
  {
    key: "delivery.invoices.photoAttachedTitle",
    default: "photo attached",
    group: "Delivery — My Invoices",
    label: "Photo-attached icon tooltip",
  },
];
