"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertEntityAccess, storeScope } from "@/lib/scope";
import { assertCanMutate, OFFICE_ROLES } from "@/lib/roles";
import { requireFeature } from "@/lib/config";
import { PROCESS_TYPES, PROCESS_TYPE_LABELS } from "@/lib/enums";
import { assertCapabilities, cleanTypes, computeLoss } from "@/lib/processes";
import { issueStock, receiveStock } from "@/lib/stock";
import type { Prisma } from "@prisma/client";
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
  assertCanMutate(ctx, "processes", [...OFFICE_ROLES, "store_keeper"]);
  await requireFeature("processes");

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
  assertCanMutate(ctx, "processes", [...OFFICE_ROLES, "store_keeper"]);
  await requireFeature("processes");

  const proc = await prisma.process.findFirst({ where: { id, entityId: ctx.entityId } });
  if (!proc) throw new Error("Process not found in this book.");
  if (proc.status !== "planned") throw new Error("Only a planned process can be started.");

  // Guarded update: the status predicate closes the check-then-update race.
  const res = await prisma.process.updateMany({
    where: { id: proc.id, entityId: ctx.entityId, status: "planned" },
    data: { status: "in_progress", startedAt: new Date() },
  });
  if (res.count === 0) throw new Error("Only a planned process can be started.");
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
  assertCanMutate(ctx, "processes", [...OFFICE_ROLES, "store_keeper"]);
  await requireFeature("processes");

  const parsed = CompleteSchema.parse(input);
  const proc = await prisma.process.findFirst({
    where: { id: parsed.id, entityId: ctx.entityId },
  });
  if (!proc) throw new Error("Process not found in this book.");
  if (proc.status === "completed" || proc.status === "cancelled") {
    throw new Error("This process is already closed.");
  }
  if (parsed.postToExpenses && (parsed.actualCost === undefined || parsed.actualCost <= 0)) {
    throw new Error("Enter an actual cost greater than zero to post it to expenses.");
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

    // Atomic close: the status predicate is the authoritative guard against
    // concurrent completes (the pre-transaction check above is a fast-fail
    // only). Matching nothing means someone else closed it first — the throw
    // rolls back the ExpenseEntry created above, so nothing double-posts.
    const res = await tx.process.updateMany({
      where: {
        id: proc.id,
        entityId: ctx.entityId,
        status: { notIn: ["completed", "cancelled"] },
      },
      data: {
        status: "completed",
        completedAt: new Date(),
        actualCost: parsed.actualCost ?? proc.actualCost,
        expenseEntryId,
      },
    });
    if (res.count === 0) throw new Error("This process is already closed.");
  });

  revalidatePath("/processes");
  revalidatePath("/expenses");
  revalidatePath("/");
}

export async function cancelProcess(id: string) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertCanMutate(ctx, "processes", OFFICE_ROLES);
  await requireFeature("processes");

  const proc = await prisma.process.findFirst({ where: { id, entityId: ctx.entityId } });
  if (!proc) throw new Error("Process not found in this book.");
  if (proc.status === "completed") throw new Error("A completed process cannot be cancelled.");

  // Guarded update: the status predicate closes the check-then-update race.
  const res = await prisma.process.updateMany({
    where: { id: proc.id, entityId: ctx.entityId, status: { notIn: ["completed", "cancelled"] } },
    data: { status: "cancelled" },
  });
  if (res.count === 0 && proc.status !== "cancelled") {
    throw new Error("This process is already closed.");
  }
  revalidatePath("/processes");
}

/* ------------------------- In-house transformation ------------------------- */

const TransformSchema = z.object({
  storeId: z.string().min(1, "Pick a store."),
  inputItemId: z.string().min(1, "Pick a raw item."),
  outputItemId: z.string().min(1, "Pick a processed item."),
  inputKg: z.coerce.number().min(0.001, "Enter the input weight."),
  outputKg: z.coerce.number().min(0.001, "Enter the output weight."),
  processTypes: z.array(z.enum(PROCESS_TYPES)).min(1, "Pick at least one process."),
  name: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  actualCost: z.coerce.number().min(0).optional(),
  postToExpenses: z.boolean().optional(),
});

export type RecordTransformationInput = z.infer<typeof TransformSchema>;

/** Find-or-create the flat "Processing" expense category and post one entry. */
async function postProcessingExpense(
  tx: Prisma.TransactionClient,
  entityId: string,
  userId: string,
  amount: number,
  note: string,
): Promise<string> {
  let cat = await tx.expenseCategory.findFirst({ where: { entityId, name: "Processing" } });
  if (!cat) {
    cat = await tx.expenseCategory.create({
      data: { name: "Processing", entityId, isOwnerAdded: false },
    });
  }
  const entry = await tx.expenseEntry.create({
    data: { amount, note, categoryId: cat.id, entityId, enteredById: userId },
  });
  return entry.id;
}

/**
 * Record a completed in-house transformation: consume `inputKg` of a RAW item at
 * a store and produce `outputKg` of a PROCESSED item there (loss = input −
 * output). Moves stock atomically (raw issued, processed received) and optionally
 * posts a processing cost to Expenses. The Process row is an immutable record.
 */
export async function recordTransformation(input: RecordTransformationInput) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  assertCanMutate(ctx, "processes", [...OFFICE_ROLES, "store_keeper"]);
  await requireFeature("processes");

  const p = TransformSchema.parse(input);
  if (p.inputItemId === p.outputItemId) throw new Error("Input and output items must differ.");

  const [store, inItem, outItem] = await Promise.all([
    prisma.store.findFirst({ where: { id: p.storeId, ...storeScope(ctx) } }),
    prisma.item.findFirst({ where: { id: p.inputItemId, entityId: ctx.entityId } }),
    prisma.item.findFirst({ where: { id: p.outputItemId, entityId: ctx.entityId } }),
  ]);
  if (!store) throw new Error("Store is not accessible in this book.");
  if (!inItem) throw new Error("Raw item is not in the active book.");
  if (!outItem) throw new Error("Processed item is not in the active book.");
  if (inItem.nature !== "raw") throw new Error("The input must be a raw item.");
  if (outItem.nature !== "processed") throw new Error("The output must be a processed item.");

  const types = cleanTypes(p.processTypes);
  if (types.length === 0) throw new Error("Pick at least one process.");
  assertCapabilities(store, types); // server-side capability gate

  const lossKg = computeLoss(p.inputKg, p.outputKg); // throws if output > input

  if (p.postToExpenses && !(p.actualCost && p.actualCost > 0)) {
    throw new Error("Enter a cost greater than zero to post it to expenses.");
  }

  const label = p.name?.trim() || `${inItem.name} → ${outItem.name}`;
  const typeNote = types.map((t) => PROCESS_TYPE_LABELS[t]).join(", ");
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const proc = await tx.process.create({
      data: {
        name: label,
        kind: "transformation",
        status: "completed",
        processTypes: JSON.stringify(types),
        storeId: store.id,
        inputItemId: inItem.id,
        outputItemId: outItem.id,
        inputKg: p.inputKg,
        outputKg: p.outputKg,
        lossKg,
        notes: p.notes || null,
        actualCost: p.actualCost ?? null,
        completedAt: now,
        stockMovedAt: now,
        entityId: ctx.entityId,
      },
    });

    await issueStock(tx, ctx.entityId, store.id, inItem.id, p.inputKg,
      `Process ${label}: ${typeNote}`, { processId: proc.id });
    await receiveStock(tx, ctx.entityId, store.id, outItem.id, p.outputKg,
      `Process ${label}: ${typeNote}`, { processId: proc.id });

    if (p.postToExpenses && p.actualCost && p.actualCost > 0) {
      const expenseEntryId = await postProcessingExpense(
        tx, ctx.entityId, ctx.user.id, p.actualCost, `Process: ${label}`,
      );
      await tx.process.update({ where: { id: proc.id }, data: { expenseEntryId } });
    }
  });

  revalidatePath("/processes");
  revalidatePath("/inventory");
  revalidatePath("/");
}
