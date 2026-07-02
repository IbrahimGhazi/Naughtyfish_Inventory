"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertEntityAccess } from "@/lib/scope";
import { assertRole, OFFICE_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

/**
 * OPTIONAL processing/production module: raw material sent out (to a vendor,
 * facility or another site) with an expected turnaround and a cost estimate.
 * Owner decision: costs live on the process; the ACTUAL cost may be posted to
 * Expenses on completion — one click, never automatic.
 */

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  destination: z.string().trim().min(1).max(120),
  materialNote: z.string().trim().max(300).optional(),
  itemId: z.string().optional(),
  fromStoreId: z.string().optional(),
  quantityKg: z.coerce.number().positive().optional(),
  expectedDays: z.coerce.number().int().min(0).max(365).optional(),
  estimatedCost: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(500).optional(),
  /** Start immediately instead of leaving it planned. */
  startNow: z.boolean().optional(),
});

export type CreateProcessInput = z.infer<typeof CreateSchema>;

export async function createProcess(input: CreateProcessInput) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, [...OFFICE_ROLES, "store_keeper"]);

  const parsed = CreateSchema.parse(input);

  // Two-book isolation: optional item/store must belong to the active book.
  if (parsed.itemId) {
    const item = await prisma.item.findFirst({
      where: { id: parsed.itemId, entityId: ctx.entityId },
      select: { id: true },
    });
    if (!item) throw new Error("Item is not in the active book.");
  }
  if (parsed.fromStoreId) {
    const store = await prisma.store.findFirst({
      where: { id: parsed.fromStoreId, entityId: ctx.entityId },
      select: { id: true },
    });
    if (!store) throw new Error("Store is not in the active book.");
  }

  const now = new Date();
  const expectedReadyAt =
    parsed.expectedDays !== undefined
      ? new Date(now.getTime() + parsed.expectedDays * 24 * 60 * 60 * 1000)
      : null;

  await prisma.process.create({
    data: {
      name: parsed.name,
      destination: parsed.destination,
      materialNote: parsed.materialNote || null,
      itemId: parsed.itemId || null,
      fromStoreId: parsed.fromStoreId || null,
      quantityKg: parsed.quantityKg ?? null,
      estimatedCost: parsed.estimatedCost ?? null,
      notes: parsed.notes || null,
      status: parsed.startNow ? "in_progress" : "planned",
      startedAt: parsed.startNow ? now : null,
      expectedReadyAt,
      entityId: ctx.entityId,
    },
  });

  revalidatePath("/processes");
  revalidatePath("/");
}

/** planned → in_progress. */
export async function startProcess(id: string) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, [...OFFICE_ROLES, "store_keeper"]);

  const proc = await prisma.process.findFirst({ where: { id, entityId: ctx.entityId } });
  if (!proc) throw new Error("Process not found in this book.");
  if (proc.status !== "planned") throw new Error("Only a planned process can be started.");

  await prisma.process.update({
    where: { id },
    data: { status: "in_progress", startedAt: new Date() },
  });
  revalidatePath("/processes");
}

const CompleteSchema = z.object({
  id: z.string().min(1),
  actualCost: z.coerce.number().min(0).optional(),
  /** Post the actual cost to Expenses under "Processing" (owner's opt-in). */
  postToExpenses: z.boolean().optional(),
});

export async function completeProcess(input: z.infer<typeof CompleteSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, [...OFFICE_ROLES, "store_keeper"]);

  const parsed = CompleteSchema.parse(input);
  const proc = await prisma.process.findFirst({
    where: { id: parsed.id, entityId: ctx.entityId },
  });
  if (!proc) throw new Error("Process not found in this book.");
  if (proc.status === "completed" || proc.status === "cancelled") {
    throw new Error("This process is already closed.");
  }
  if (parsed.postToExpenses && parsed.actualCost === undefined) {
    throw new Error("Enter the actual cost to post it to expenses.");
  }

  await prisma.$transaction(async (tx) => {
    let expenseEntryId: string | null = null;

    if (parsed.postToExpenses && parsed.actualCost !== undefined && parsed.actualCost > 0) {
      // Find-or-create the flat "Processing" category (plan: flat list only).
      let cat = await tx.expenseCategory.findFirst({
        where: { entityId: ctx.entityId, name: "Processing" },
      });
      if (!cat) {
        cat = await tx.expenseCategory.create({
          data: { name: "Processing", entityId: ctx.entityId, isOwnerAdded: false },
        });
      }
      const entry = await tx.expenseEntry.create({
        data: {
          amount: parsed.actualCost,
          note: `Process: ${proc.name} → ${proc.destination}`,
          categoryId: cat.id,
          entityId: ctx.entityId,
          enteredById: ctx.user.id,
        },
      });
      expenseEntryId = entry.id;
    }

    await tx.process.update({
      where: { id: proc.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        actualCost: parsed.actualCost ?? proc.actualCost,
        expenseEntryId,
      },
    });
  });

  revalidatePath("/processes");
  revalidatePath("/expenses");
  revalidatePath("/");
}

export async function cancelProcess(id: string) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertRole(ctx, OFFICE_ROLES);

  const proc = await prisma.process.findFirst({ where: { id, entityId: ctx.entityId } });
  if (!proc) throw new Error("Process not found in this book.");
  if (proc.status === "completed") throw new Error("A completed process cannot be cancelled.");

  await prisma.process.update({ where: { id }, data: { status: "cancelled" } });
  revalidatePath("/processes");
}
