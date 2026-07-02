import type { CopyFragment } from "./types";

/**
 * Copy for the inventory area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const inventoryCopy: CopyFragment = [
  // ── Inventory page ─────────────────────────────────────────────
  { key: "inventory.eyebrow", default: "Operations", group: "Inventory", label: "Page header eyebrow" },
  { key: "inventory.title", default: "Inventory", group: "Inventory", label: "Page title" },
  { key: "inventory.grandTotal", default: "Grand total", group: "Inventory", label: "Grand-total banner label (before store count)" },
  { key: "inventory.storeSingular", default: "store", group: "Inventory", label: "Grand-total banner: singular ‘store’" },
  { key: "inventory.storePlural", default: "stores", group: "Inventory", label: "Grand-total banner: plural ‘stores’" },
  { key: "inventory.cartonsLabel", default: "cartons", group: "Inventory", label: "Grand-total banner: ‘cartons’ unit label" },
  { key: "inventory.noStores", default: "No stores in your scope.", group: "Inventory", label: "Empty state: no stores visible" },
  { key: "inventory.noStock", default: "No stock recorded.", group: "Inventory", label: "Empty state: store has no stock" },
  { key: "inventory.colItem", default: "Item", group: "Inventory", label: "Table column: Item" },
  { key: "inventory.colLevel", default: "Level", group: "Inventory", label: "Table column: Level" },
  { key: "inventory.colCartons", default: "Cartons", group: "Inventory", label: "Table column: Cartons" },
  { key: "inventory.colPackets", default: "Packets", group: "Inventory", label: "Table column: Packets" },
  { key: "inventory.colKgPerCarton", default: "Kg / carton", group: "Inventory", label: "Table column: Kg / carton" },
  { key: "inventory.colNetWeight", default: "Net weight", group: "Inventory", label: "Table column: Net weight" },
  { key: "inventory.storeTotal", default: "Store total", group: "Inventory", label: "Table footer: store total row label" },
  { key: "inventory.adjustCardTitle", default: "Receive / adjust stock", group: "Inventory", label: "‘Receive / adjust stock’ card title" },
  { key: "inventory.adjustCardHelp", default: "Adds to the store's on-hand and records a stock movement. Negative values are allowed for real-world corrections.", group: "Inventory", label: "‘Receive / adjust stock’ card helper text", multiline: true },

  // ── Stock adjust form ──────────────────────────────────────────
  { key: "inventory.fieldStore", default: "Store", group: "Inventory · Adjust form", label: "Field label: Store" },
  { key: "inventory.selectStore", default: "Select store…", group: "Inventory · Adjust form", label: "Store select placeholder option" },
  { key: "inventory.fieldItem", default: "Item", group: "Inventory · Adjust form", label: "Field label: Item" },
  { key: "inventory.selectItem", default: "Select item…", group: "Inventory · Adjust form", label: "Item select placeholder option" },
  { key: "inventory.fieldMovementType", default: "Movement type", group: "Inventory · Adjust form", label: "Field label: Movement type" },
  { key: "inventory.typeReceive", default: "receive", group: "Inventory · Adjust form", label: "Movement type toggle: receive" },
  { key: "inventory.typeAdjust", default: "adjust", group: "Inventory · Adjust form", label: "Movement type toggle: adjust" },
  { key: "inventory.fieldCartons", default: "Cartons", group: "Inventory · Adjust form", label: "Field label: Cartons" },
  { key: "inventory.fieldPackets", default: "Packets", group: "Inventory · Adjust form", label: "Field label: Packets" },
  { key: "inventory.fieldKgPerCarton", default: "Kg / carton", group: "Inventory · Adjust form", label: "Field label: Kg / carton" },
  { key: "inventory.fieldTotalKg", default: "Total kg", group: "Inventory · Adjust form", label: "Field label: Total kg" },
  { key: "inventory.hintComputed", default: "computed", group: "Inventory · Adjust form", label: "Total kg hint: computed" },
  { key: "inventory.hintOverride", default: "override", group: "Inventory · Adjust form", label: "Total kg hint: override" },
  { key: "inventory.fieldNote", default: "Note", group: "Inventory · Adjust form", label: "Field label: Note" },
  { key: "inventory.saving", default: "Saving…", group: "Inventory · Adjust form", label: "Submit button: pending state" },
  { key: "inventory.receiveStock", default: "Receive stock", group: "Inventory · Adjust form", label: "Submit button: receive" },
  { key: "inventory.adjustStock", default: "Adjust stock", group: "Inventory · Adjust form", label: "Submit button: adjust" },
  { key: "inventory.willApplyPrefix", default: "Will apply", group: "Inventory · Adjust form", label: "Apply hint prefix (before kg amount)" },
  { key: "inventory.willApplySuffix", default: "kg to the store.", group: "Inventory · Adjust form", label: "Apply hint suffix (after kg amount)" },
  { key: "inventory.saved", default: "✓ Saved.", group: "Inventory · Adjust form", label: "Success toast" },
];
