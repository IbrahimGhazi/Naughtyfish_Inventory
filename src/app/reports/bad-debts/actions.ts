"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requireFeature } from "@/lib/config";
import { assertRole, OFFICE_ROLES } from "@/lib/roles";
import { entityScope, assertEntityAccess } from "@/lib/scope";
import { BAD_DEBT_SUBCATEGORIES } from "@/lib/enums";
import { revalidatePath } from "next/cache";

const CreateSchema = z
  .object({
    subCategory: z.enum(BAD_DEBT_SUBCATEGORIES),
    amount: z.coerce.number().positive(),
    personName: z.string().trim().max(120).optional(),
    partyId: z.string().optional(),
    invoiceId: z.string().optional(),
    note: z.string().trim().max(500).optional(),
    date: z.string().optional(),
  })
  .refine((v) => (v.personName && v.personName.length > 0) || (v.partyId && v.partyId.length > 0), {
    message: "Provide a person name or select a party.",
    path: ["personName"],
  });

/**
 * Record a bad-debt write-off or disputed amount (plan §3). Optionally links a
 * real Party and a specific Invoice for dispute defense ("this party disputes
 * invoice #101"), while still allowing a free-text personName when the
 * counterparty isn't a tracked party. Both party & invoice are validated to
 * belong to the active book before linking.
 */
export async function createBadDebt(input: z.infer<typeof CreateSchema>) {
  const ctx = await getActiveContext();
  assertRole(ctx, OFFICE_ROLES);
  await assertEntityAccess(ctx);
  await requireFeature("reports");
  const parsed = CreateSchema.parse(input);
  const scope = entityScope(ctx);

  // Resolve + validate the optional party link, deriving personName from it
  // when the free-text name was left blank.
  let partyId: string | null = null;
  let personName = parsed.personName?.trim() ?? "";
  if (parsed.partyId) {
    const party = await prisma.party.findFirst({
      where: { id: parsed.partyId, ...scope },
      select: { id: true, name: true },
    });
    if (!party) throw new Error("Selected party is not in the active book.");
    partyId = party.id;
    if (!personName) personName = party.name;
  }

  if (!personName) throw new Error("Provide a person name or select a party.");

  // Resolve + validate the optional invoice link.
  let invoiceId: string | null = null;
  if (parsed.invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: parsed.invoiceId, ...scope },
      select: { id: true },
    });
    if (!invoice) throw new Error("Selected invoice is not in the active book.");
    invoiceId = invoice.id;
  }

  await prisma.badDebtEntry.create({
    data: {
      personName,
      amount: parsed.amount,
      subCategory: parsed.subCategory,
      note: parsed.note && parsed.note.length > 0 ? parsed.note : null,
      date: parsed.date ? new Date(parsed.date) : new Date(),
      entityId: ctx.entityId,
      partyId,
      invoiceId,
    },
  });

  revalidatePath("/reports/bad-debts");
}

const DeleteSchema = z.object({ id: z.string().min(1) });

/**
 * Delete a bad-debt/dispute entry. These are correctable ledger corrections (not
 * append-only records), so a straight delete is intentional. Scoped so a user
 * can only delete rows in their active book.
 */
export async function deleteBadDebt(input: z.infer<typeof DeleteSchema>) {
  const ctx = await getActiveContext();
  assertRole(ctx, OFFICE_ROLES);
  await assertEntityAccess(ctx);
  await requireFeature("reports");
  const parsed = DeleteSchema.parse(input);

  const existing = await prisma.badDebtEntry.findFirst({
    where: { id: parsed.id, ...entityScope(ctx) },
    select: { id: true },
  });
  if (!existing) throw new Error("Entry not found in the active book.");

  await prisma.badDebtEntry.delete({ where: { id: existing.id } });

  revalidatePath("/reports/bad-debts");
}
