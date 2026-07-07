/**
 * Store-level stock movement helpers (server-only; take a Prisma transaction
 * client). These mirror the upsert-StoreInventoryLine + append-StockMovement
 * pattern used by invoices (applyDispatchToStore) and purchases
 * (applyReceiveToStore), reduced to a single item + kg so processes and
 * store-to-store transfers can reuse them.
 *
 * v1 is kg-only: a raw→processed transformation changes both weight (loss) and
 * the item form, so carton/packet counters don't carry across the boundary and
 * are left untouched. Negative on-hand is allowed (real-world corrections),
 * matching applyDispatchToStore.
 */
import type { Prisma } from "@prisma/client";
import { round3 } from "./inventory";

type Tx = Prisma.TransactionClient;

interface Provenance {
  processId?: string;
  shipmentId?: string;
}

/** Deduct `kg` of `itemId` from `storeId` and append an "issue" StockMovement. */
export async function issueStock(
  tx: Tx,
  entityId: string,
  storeId: string,
  itemId: string,
  kg: number,
  note: string,
  provenance: Provenance = {},
): Promise<void> {
  const existing = await tx.storeInventoryLine.findUnique({
    where: { storeId_itemId: { storeId, itemId } },
  });
  await tx.storeInventoryLine.upsert({
    where: { storeId_itemId: { storeId, itemId } },
    create: { storeId, itemId, cartonCount: 0, packetCount: 0, kgPerCarton: 0, totalKg: round3(-kg) },
    update: { totalKg: round3(Number(existing?.totalKg ?? 0) - kg) },
  });
  await tx.stockMovement.create({
    data: {
      type: "issue",
      cartons: 0,
      packets: 0,
      kg, // magnitude; direction is carried by type + fromStore
      note,
      fromStoreId: storeId,
      itemId,
      entityId,
      processId: provenance.processId ?? null,
      shipmentId: provenance.shipmentId ?? null,
    },
  });
}

/** Add `kg` of `itemId` into `storeId` and append a "receive" StockMovement. */
export async function receiveStock(
  tx: Tx,
  entityId: string,
  storeId: string,
  itemId: string,
  kg: number,
  note: string,
  provenance: Provenance = {},
): Promise<void> {
  const existing = await tx.storeInventoryLine.findUnique({
    where: { storeId_itemId: { storeId, itemId } },
  });
  await tx.storeInventoryLine.upsert({
    where: { storeId_itemId: { storeId, itemId } },
    create: { storeId, itemId, cartonCount: 0, packetCount: 0, kgPerCarton: 0, totalKg: round3(kg) },
    update: { totalKg: round3(Number(existing?.totalKg ?? 0) + kg) },
  });
  await tx.stockMovement.create({
    data: {
      type: "receive",
      cartons: 0,
      packets: 0,
      kg,
      note,
      toStoreId: storeId,
      itemId,
      entityId,
      processId: provenance.processId ?? null,
      shipmentId: provenance.shipmentId ?? null,
    },
  });
}
