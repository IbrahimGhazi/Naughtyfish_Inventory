import type { CopyFragment } from "./types";

/**
 * Store-management (per-store costs) copy. These costs are ExpenseEntry rows
 * tagged with a storeId, so they roll into the Expenses page and P&L.
 */
export const storesCopy: CopyFragment = [
  { key: "stores.eyebrow", default: "Money", group: "Store costs", label: "Page eyebrow" },
  { key: "stores.title", default: "Store costs", group: "Store costs", label: "Page title" },
  { key: "stores.subtitle", default: "Rent, wages and other running costs per store — these roll into your expenses and profit.", group: "Store costs", label: "Page subtitle" },
  { key: "stores.noStores", default: "No stores yet — add one in Settings → Stores first.", group: "Store costs", label: "Empty state: no stores" },
  { key: "stores.thisMonth", default: "This month", group: "Store costs", label: "This-month total label" },
  { key: "stores.allTime", default: "All time", group: "Store costs", label: "All-time total label" },
  { key: "stores.addHeading", default: "Add a cost", group: "Store costs", label: "Add-cost card heading" },
  { key: "stores.fieldCategory", default: "Category", group: "Store costs", label: "Field: category" },
  { key: "stores.fieldAmount", default: "Amount (PKR)", group: "Store costs", label: "Field: amount" },
  { key: "stores.fieldDate", default: "Date", group: "Store costs", label: "Field: date" },
  { key: "stores.dateHint", default: "defaults to today", group: "Store costs", label: "Field hint: date" },
  { key: "stores.fieldNote", default: "Note", group: "Store costs", label: "Field: note" },
  { key: "stores.selectOption", default: "Select…", group: "Store costs", label: "Category select placeholder" },
  { key: "stores.add", default: "Add cost", group: "Store costs", label: "Add-cost button" },
  { key: "stores.adding", default: "Saving…", group: "Store costs", label: "Add-cost button (pending)" },
  { key: "stores.saved", default: "Saved ✓", group: "Store costs", label: "Add-cost success flash" },
  { key: "stores.noCategories", default: "Add a category (Rent, Wages, …) below to start logging costs.", group: "Store costs", label: "Empty state: no categories" },
  { key: "stores.customLabel", default: "Need another cost type?", group: "Store costs", label: "Add-custom-category label" },
  { key: "stores.recentHeading", default: "Recent costs", group: "Store costs", label: "Recent costs table heading" },
  { key: "stores.noEntries", default: "No costs recorded for this store yet.", group: "Store costs", label: "Empty state: no entries for store" },
  { key: "stores.colDate", default: "Date", group: "Store costs", label: "Table column: date" },
  { key: "stores.colCategory", default: "Category", group: "Store costs", label: "Table column: category" },
  { key: "stores.colNote", default: "Note", group: "Store costs", label: "Table column: note" },
  { key: "stores.colAmount", default: "Amount", group: "Store costs", label: "Table column: amount" },
];
