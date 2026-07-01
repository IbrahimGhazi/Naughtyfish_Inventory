/**
 * NaughtyFish — Inventory helpers.
 *
 * The tape: "stock pehle nikaalte hain, phir deliver karne jaate hain" — stock
 * is deducted from the source store at DISPATCH (invoice creation), and an
 * invoice EDIT applies the DELTA (old − new) back against the same store.
 *
 * Editing an invoice can only move stock by the change between the old and new
 * line sets. e.g. a line billed 5 kg short → 5 kg flows back into the store.
 * `computeStockDelta` is a PURE function (no DB) so it can be unit-tested; the
 * server action turns each per-item delta into a StockMovement + inventory upsert.
 */

/** One item's dispatched quantities off an invoice line. */
export interface StockLineQty {
  itemId: string;
  kg: number;
  cartons: number;
  packets: number;
}

/** Aggregated per-item quantity, keyed by itemId. */
export interface ItemQty {
  itemId: string;
  kg: number;
  cartons: number;
  packets: number;
}

/**
 * Sum line quantities per item. A single invoice may carry two lines of the
 * same item; inventory effects aggregate at the item level.
 */
export function aggregateByItem(lines: StockLineQty[]): Map<string, ItemQty> {
  const byItem = new Map<string, ItemQty>();
  for (const l of lines) {
    const cur = byItem.get(l.itemId) ?? { itemId: l.itemId, kg: 0, cartons: 0, packets: 0 };
    cur.kg = round3(cur.kg + l.kg);
    cur.cartons += l.cartons;
    cur.packets += l.packets;
    byItem.set(l.itemId, cur);
  }
  return byItem;
}

/**
 * The delta an invoice EDIT applies to the source store, per item.
 *
 * At dispatch we deducted the OLD quantities from stock. After an edit the store
 * should reflect the NEW quantities, so the store must be adjusted by
 *   applyToStore = old − new
 * (a positive value flows BACK into the store — the owner's "5 kg short" case;
 * a negative value takes more OUT). Only items whose quantity actually changed
 * are returned.
 */
export function computeStockDelta(
  oldLines: StockLineQty[],
  newLines: StockLineQty[],
): ItemQty[] {
  const oldByItem = aggregateByItem(oldLines);
  const newByItem = aggregateByItem(newLines);
  const itemIds = new Set<string>([...oldByItem.keys(), ...newByItem.keys()]);

  const deltas: ItemQty[] = [];
  for (const itemId of itemIds) {
    const o = oldByItem.get(itemId) ?? { itemId, kg: 0, cartons: 0, packets: 0 };
    const n = newByItem.get(itemId) ?? { itemId, kg: 0, cartons: 0, packets: 0 };
    const delta: ItemQty = {
      itemId,
      kg: round3(o.kg - n.kg),
      cartons: o.cartons - n.cartons,
      packets: o.packets - n.packets,
    };
    if (delta.kg !== 0 || delta.cartons !== 0 || delta.packets !== 0) {
      deltas.push(delta);
    }
  }
  return deltas;
}

/** Weight precision: 3 dp (grams), matching the billing engine's roundKg. */
export function round3(x: number): number {
  return Math.round((x + Number.EPSILON) * 1000) / 1000;
}
