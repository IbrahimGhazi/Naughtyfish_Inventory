"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertCanMutate, OFFICE_ROLES } from "@/lib/roles";
import { entityScope, assertEntityAccess, storeScope } from "@/lib/scope";
import { round3 } from "@/lib/inventory";
import { revalidatePath } from "next/cache";

const AdjustSchema = z.object({
  storeId: z.string().min(1),
  itemId: z.string().min(1),
  type: z.enum(["receive", "adjust"]),
  cartons: z.coerce.number().int().default(0),
  packets: z.coerce.number().int().default(0),
  kgPerCarton: z.coerce.number().min(0).default(0),
  totalKg: z.coerce.number(),
  note: z.string().optional(),
});

export type AdjustStockInput = z.infer<typeof AdjustSchema>;

/**
 * Receive or manually adjust stock for one (store, item). Upserts the
 * StoreInventoryLine (@@unique[storeId,itemId]) by ADDING the entered quantities
 * to the current on-hand, and appends a StockMovement {type: receive|adjust,
 * toStore} for the audit trail. Negative entries are allowed — the owner does
 * real-world corrections and stock may legitimately go negative.
 */
export async function adjustStock(input: AdjustStockInput) {
  const ctx = await getActiveContext();
  assertCanMutate(ctx, "inventory", [...OFFICE_ROLES, "store_keeper", "north_employee"]);
  await assertEntityAccess(ctx);
  const parsed = AdjustSchema.parse(input);

  // Store must be one the user is allowed to see (store-scope, not just entity).
  const store = await prisma.store.findFirst({
    where: { ...storeScope(ctx), id: parsed.storeId },
  });
  if (!store) throw new Error("Store is not accessible in this book.");

  const item = await prisma.item.findFirst({
    where: { id: parsed.itemId, ...entityScope(ctx) },
  });
  if (!item) throw new Error("Item is not in the active book.");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.storeInventoryLine.findUnique({
      where: { storeId_itemId: { storeId: store.id, itemId: item.id } },
    });

    const newCartons = (existing?.cartonCount ?? 0) + parsed.cartons;
    const newPackets = (existing?.packetCount ?? 0) + parsed.packets;
    const newTotalKg = round3(Number(existing?.totalKg ?? 0) + parsed.totalKg);
    // kgPerCarton is a reference figure — take the latest entered value if given.
    const newKgPerCarton = parsed.kgPerCarton > 0 ? parsed.kgPerCarton : Number(existing?.kgPerCarton ?? 0);

    await tx.storeInventoryLine.upsert({
      where: { storeId_itemId: { storeId: store.id, itemId: item.id } },
      create: {
        storeId: store.id,
        itemId: item.id,
        cartonCount: parsed.cartons,
        packetCount: parsed.packets,
        kgPerCarton: parsed.kgPerCarton,
        totalKg: parsed.totalKg,
      },
      update: {
        cartonCount: newCartons,
        packetCount: newPackets,
        kgPerCarton: newKgPerCarton,
        totalKg: newTotalKg,
      },
    });

    await tx.stockMovement.create({
      data: {
        type: parsed.type,
        cartons: parsed.cartons,
        packets: parsed.packets,
        kg: parsed.totalKg,
        note: parsed.note,
        toStoreId: store.id,
        itemId: item.id,
        entityId: ctx.entityId,
      },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/");
}
