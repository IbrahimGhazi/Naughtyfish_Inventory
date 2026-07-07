import type { CopyFragment } from "./types";

/**
 * Copy for the expenses area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const expensesCopy: CopyFragment = [
  { key: "expenses.eyebrow", default: "Money", group: "Expenses", label: "Page header eyebrow" },
  { key: "expenses.title", default: "Expenses", group: "Expenses", label: "Page title" },
  { key: "expenses.thisMonth", default: "This month", group: "Expenses", label: "Header ‘This month’ total label" },
  { key: "expenses.noCategories", default: "No categories yet — add one below.", group: "Expenses", label: "Empty-state: no categories" },
  { key: "expenses.catAddedSuffix", default: "·added", group: "Expenses", label: "Owner-added category chip suffix" },
  { key: "expenses.noEntries", default: "No expense entries yet.", group: "Expenses", label: "Empty-state: no expense entries" },
  { key: "expenses.colDate", default: "Date", group: "Expenses", label: "Entries table: Date column header" },
  { key: "expenses.colCategory", default: "Category", group: "Expenses", label: "Entries table: Category column header" },
  { key: "expenses.colNote", default: "Note", group: "Expenses", label: "Entries table: Note column header" },
  { key: "expenses.colAmount", default: "Amount", group: "Expenses", label: "Entries table: Amount column header" },
  { key: "expenses.catPlaceholder", default: "New category (e.g. fuel, labor, cartons)", group: "Expenses", label: "Add-category input placeholder" },
  { key: "expenses.catAdding", default: "Adding…", group: "Expenses", label: "Add-category button (pending)" },
  { key: "expenses.catAdd", default: "+ Add category", group: "Expenses", label: "Add-category button" },
  { key: "expenses.catRemove", default: "Remove category", group: "Expenses", label: "Remove-category button tooltip" },
  { key: "expenses.catRemoveYes", default: "Remove", group: "Expenses", label: "Remove-category confirm button" },
  { key: "expenses.catRemoveNo", default: "Cancel", group: "Expenses", label: "Remove-category cancel button" },
  { key: "expenses.fieldCategory", default: "Category", group: "Expenses", label: "Add-entry field label: Category" },
  { key: "expenses.selectOption", default: "Select…", group: "Expenses", label: "Add-entry category select placeholder option" },
  { key: "expenses.fieldAmount", default: "Amount (PKR)", group: "Expenses", label: "Add-entry field label: Amount" },
  { key: "expenses.fieldDate", default: "Date", group: "Expenses", label: "Add-entry field label: Date" },
  { key: "expenses.dateHint", default: "defaults to today", group: "Expenses", label: "Add-entry Date field hint" },
  { key: "expenses.fieldNote", default: "Note", group: "Expenses", label: "Add-entry field label: Note" },
  { key: "expenses.entrySaving", default: "Saving…", group: "Expenses", label: "Add-entry button (pending)" },
  { key: "expenses.entryAdd", default: "Add expense", group: "Expenses", label: "Add-entry button" },
  { key: "expenses.entrySaved", default: "✓ Saved.", group: "Expenses", label: "Add-entry success message" },
];
