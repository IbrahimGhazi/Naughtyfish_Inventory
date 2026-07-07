"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertCanMutate, OFFICE_ROLES } from "@/lib/roles";
import { entityScope, assertEntityAccess } from "@/lib/scope";
import { requireFeature } from "@/lib/config";
import { revalidatePath } from "next/cache";

const CategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
});

/**
 * Add a flat, owner-editable expense category (plan §4.8: "give me an add
 * option"). Unique per entity+name; owner-added rows are tagged isOwnerAdded.
 * Nested trees are Parked (plan §9).
 */
export async function addExpenseCategory(input: z.infer<typeof CategorySchema>) {
  const ctx = await getActiveContext();
  assertCanMutate(ctx, "expenses", OFFICE_ROLES);
  await assertEntityAccess(ctx);
  await requireFeature("expenses");
  const parsed = CategorySchema.parse(input);

  const existing = await prisma.expenseCategory.findFirst({
    where: { ...entityScope(ctx), name: parsed.name },
  });
  if (existing) throw new Error("A category with that name already exists.");

  await prisma.expenseCategory.create({
    data: {
      name: parsed.name,
      isOwnerAdded: true,
      entityId: ctx.entityId,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/stores");
}

const EntrySchema = z.object({
  categoryId: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.string().optional(),
  note: z.string().optional(),
  /** Optional store attribution (store-management costs). Rolls into P&L. */
  storeId: z.string().optional(),
});

/**
 * Record an expense entry against a category, optionally attributed to a store
 * (store-management costs). Store-tagged entries are still ordinary expenses —
 * they roll into the Expenses total and the dashboard P&L automatically.
 */
export async function addExpenseEntry(input: z.infer<typeof EntrySchema>) {
  const ctx = await getActiveContext();
  assertCanMutate(ctx, "expenses", OFFICE_ROLES);
  await assertEntityAccess(ctx);
  await requireFeature("expenses");
  const parsed = EntrySchema.parse(input);

  // Category must belong to the active book.
  const category = await prisma.expenseCategory.findFirst({
    where: { id: parsed.categoryId, ...entityScope(ctx) },
  });
  if (!category) throw new Error("Category is not in the active book.");

  // If a store is given, it must belong to the active book too (never trust ids).
  let storeId: string | undefined;
  if (parsed.storeId) {
    const store = await prisma.store.findFirst({
      where: { id: parsed.storeId, ...entityScope(ctx) },
      select: { id: true },
    });
    if (!store) throw new Error("Store is not in the active book.");
    storeId = store.id;
  }

  await prisma.expenseEntry.create({
    data: {
      amount: parsed.amount,
      date: parsed.date ? new Date(parsed.date) : new Date(),
      note: parsed.note,
      categoryId: category.id,
      storeId,
      entityId: ctx.entityId,
      enteredById: ctx.user.id,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/stores");
  revalidatePath("/");
}
