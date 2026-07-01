"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope, assertEntityAccess } from "@/lib/scope";
import { revalidatePath } from "next/cache";

const CreateSchema = z.object({
  bankName: z.string().min(1),
  accountName: z.string().min(1),
  estimatedBalance: z.coerce.number(),
});

export async function createBankAccount(input: z.infer<typeof CreateSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  const parsed = CreateSchema.parse(input);

  await prisma.bankAccount.create({
    data: {
      bankName: parsed.bankName,
      accountName: parsed.accountName,
      estimatedBalance: parsed.estimatedBalance,
      entityId: ctx.entityId,
    },
  });

  revalidatePath("/banks");
  revalidatePath("/");
}

const BalanceSchema = z.object({
  id: z.string().min(1),
  estimatedBalance: z.coerce.number(),
});

/**
 * Manual balance edit only — the owner types the number. Per plan §9 the
 * estimated balance is NEVER auto-decremented from cheques/payments.
 */
export async function updateBankBalance(input: z.infer<typeof BalanceSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  const parsed = BalanceSchema.parse(input);
  const scope = entityScope(ctx);

  const bank = await prisma.bankAccount.findFirst({ where: { id: parsed.id, ...scope } });
  if (!bank) throw new Error("Bank account is not in the active book.");

  await prisma.bankAccount.update({
    where: { id: bank.id },
    data: { estimatedBalance: parsed.estimatedBalance },
  });

  revalidatePath("/banks");
  revalidatePath("/");
}
