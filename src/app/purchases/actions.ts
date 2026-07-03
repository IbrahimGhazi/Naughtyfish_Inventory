"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertEntityAccess } from "@/lib/scope";
import { assertRole, OFFICE_ROLES } from "@/lib/roles";
import { requireFeature } from "@/lib/config";
import { round3 } from "@/lib/inventory";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

type Tx = Prisma.TransactionClient;

const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

const LineSchema = z.object({
  itemId: z.string().min(1),
  weightKg: z.coerce.number().positive("Weight must be greater than zero."),
  ratePerKg: z.coerce.number().positive("Rate must be greater than zero."),
  cartons: z.coerce.number().int().min(0).optional(),
});

const CreateSchema = z.object({
  partyId: z.string().min(1, "Pick a supplier."),
  storeId: z.string().min(1, "Pick a receiving store."),
  supplierBillNo: z.string().trim().max(60).optional(),
  date: z.string().optional(), // yyyy-mm-dd; defaults to now
  notes: z.string().trim().max(500).optional(),
  lines: z.array(LineSchema).min(1, "Add at least one line."),
});

export type CreatePurchaseInput = z.infer<typeof CreateSchema>;

/**
 * Receive purchased quantities into the store: upsert the StoreInventoryLine
 * (adding kg + cartons) and record a "receive" StockMovement per line, linked
 * to the purchase for provenance. Mirrors applyDispatchToStore in reverse.
 */
async function applyReceiveToStore(
  tx: Tx,
  entityId: string,
  storeId: string,
  purchaseId: string,
  reference: string,
  lines: { itemId: string; weightKg: number; cartons: number }[],
): Promise<void> {
  // Aggregate per item so two lines of the same item upsert once.
  const byItem = new Map<string, { itemId: string; kg: number; cartons: number }>();
  for (const l of lines) {
    const q = byItem.get(l.itemId) ?? { itemId: l.itemId, kg: 0, cartons: 0 };
    q.kg = round3(q.kg + l.weightKg);
    q.cartons += l.cartons;
    byItem.set(l.itemId, q);
  }

  for (const q of byItem.values()) {
    const existing = await tx.storeInventoryLine.findUnique({
      where: { storeId_itemId: { storeId, itemId: q.itemId } },
    });
    await tx.storeInventoryLine.upsert({
      where: { storeId_itemId: { storeId, itemId: q.itemId } },
      create: {
        storeId,
        itemId: q.itemId,
        cartonCount: q.cartons,
        packetCount: 0,
        kgPerCarton: existing?.kgPerCarton ?? 0,
        totalKg: q.kg,
      },
      update: {
        cartonCount: (existing?.cartonCount ?? 0) + q.cartons,
        totalKg: round3(Number(existing?.totalKg ?? 0) + q.kg),
      },
    });
    await tx.stockMovement.create({
      data: {
        type: "receive",
        cartons: q.cartons,
        packets: 0,
        kg: q.kg,
        note: `Purchase ${reference}`,
        toStoreId: storeId,
        itemId: q.itemId,
        purchaseId,
        entityId,
      },
    });
  }
}

/**
 * Record a purchase from a supplier: number it per book (PUR-000001), store the
 * weight × rate lines, RECEIVE the stock into the chosen store, and charge the
 * supplier's ledger (payables) by the total. Append-only — no edit/delete yet
 * (corrections go through a reversing entry once M1.1 voids land).
 */
export async function createPurchase(input: CreatePurchaseInput): Promise<{
  id: string;
  reference: string;
  total: number;
}> {
  const ctx = await getActiveContext();
  assertRole(ctx, OFFICE_ROLES);
  await assertEntityAccess(ctx);
  await requireFeature("purchases");
  const parsed = CreateSchema.parse(input);

  // Book-scoped validations: supplier, store and every item must belong to
  // the active book, and the party must actually be a supplier.
  const [supplier, store, items] = await Promise.all([
    prisma.party.findFirst({ where: { id: parsed.partyId, entityId: ctx.entityId } }),
    prisma.store.findFirst({ where: { id: parsed.storeId, entityId: ctx.entityId } }),
    prisma.item.findMany({
      where: { id: { in: parsed.lines.map((l) => l.itemId) }, entityId: ctx.entityId },
      select: { id: true },
    }),
  ]);
  if (!supplier) throw new Error("Supplier not found in this book.");
  if (supplier.partyType !== "supplier") throw new Error("That party is not a supplier.");
  if (!store) throw new Error("Store not found in this book.");
  const itemIds = new Set(items.map((i) => i.id));
  for (const l of parsed.lines) {
    if (!itemIds.has(l.itemId)) throw new Error("An item on the purchase is not in this book.");
  }

  const date = parsed.date ? new Date(`${parsed.date}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date.");

  const lines = parsed.lines.map((l) => ({
    itemId: l.itemId,
    weightKg: round3(l.weightKg),
    ratePerKg: l.ratePerKg,
    cartons: l.cartons ?? 0,
    amount: round2(l.weightKg * l.ratePerKg),
  }));
  const total = round2(lines.reduce((s, l) => s + l.amount, 0));

  const result = await prisma.$transaction(async (tx) => {
    // Per-book sequence (scoped to entityId; @@unique([entityId, purchaseNumber])
    // makes a lost race fail loudly instead of double-numbering).
    const last = await tx.purchase.findFirst({
      where: { entityId: ctx.entityId },
      orderBy: { purchaseNumber: "desc" },
      select: { purchaseNumber: true },
    });
    const purchaseNumber = (last?.purchaseNumber ?? 0) + 1;
    const reference = `PUR-${String(purchaseNumber).padStart(6, "0")}`;

    const purchase = await tx.purchase.create({
      data: {
        purchaseNumber,
        reference,
        supplierBillNo: parsed.supplierBillNo || null,
        date,
        notes: parsed.notes || null,
        totalAmount: total,
        entityId: ctx.entityId,
        partyId: supplier.id,
        storeId: store.id,
        enteredById: ctx.user.id,
        lineItems: {
          create: lines.map((l) => ({
            itemId: l.itemId,
            weightKg: l.weightKg,
            ratePerKg: l.ratePerKg,
            cartons: l.cartons || null,
            amount: l.amount,
          })),
        },
      },
    });

    await applyReceiveToStore(
      tx,
      ctx.entityId,
      store.id,
      purchase.id,
      reference,
      lines.map((l) => ({ itemId: l.itemId, weightKg: l.weightKg, cartons: l.cartons })),
    );

    return purchase;
  });

  revalidatePath("/purchases");
  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath(`/parties/${supplier.id}`);

  return { id: result.id, reference: result.reference, total };
}
