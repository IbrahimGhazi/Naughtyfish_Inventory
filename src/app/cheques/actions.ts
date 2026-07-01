"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope, assertEntityAccess } from "@/lib/scope";
import { CHEQUE_STATUSES } from "@/lib/enums";
import { revalidatePath } from "next/cache";

/** Allowed status transitions. `cleared` is terminal (no outgoing edges). */
const TRANSITIONS: Record<string, string[]> = {
  issued: ["cleared", "held", "bounced", "pending"],
  pending: ["cleared", "held", "bounced"],
  held: ["cleared", "bounced", "pending"],
  bounced: ["cleared", "held", "pending"],
  cleared: [], // terminal
};

const StatusSchema = z.object({
  chequeId: z.string().min(1),
  status: z.enum(CHEQUE_STATUSES),
});

export async function updateChequeStatus(input: z.infer<typeof StatusSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  const parsed = StatusSchema.parse(input);
  const scope = entityScope(ctx);

  const cheque = await prisma.cheque.findFirst({ where: { id: parsed.chequeId, ...scope } });
  if (!cheque) throw new Error("Cheque is not in the active book.");

  if (cheque.status === "cleared") {
    throw new Error("Cleared cheques are terminal and cannot change status.");
  }
  const allowed = TRANSITIONS[cheque.status] ?? [];
  if (!allowed.includes(parsed.status)) {
    throw new Error(`Cannot move a cheque from "${cheque.status}" to "${parsed.status}".`);
  }

  await prisma.cheque.update({
    where: { id: cheque.id },
    data: { status: parsed.status },
  });

  revalidatePath("/cheques");
  revalidatePath("/");
}

const OutgoingSchema = z.object({
  chequeNumber: z.string().min(1),
  bankAccountId: z.string().min(1),
  amount: z.coerce.number().positive(),
  recipientName: z.string().min(1),
  issueDate: z.string().optional(),
  clearingDue: z.string().optional(),
});

export async function createOutgoingCheque(input: z.infer<typeof OutgoingSchema>) {
  const ctx = await getActiveContext();
  await assertEntityAccess(ctx);
  const parsed = OutgoingSchema.parse(input);
  const scope = entityScope(ctx);

  const bank = await prisma.bankAccount.findFirst({
    where: { id: parsed.bankAccountId, ...scope },
  });
  if (!bank) throw new Error("Bank account is not in the active book.");

  const clearingDue = parsed.clearingDue ? new Date(parsed.clearingDue) : null;
  const reminderDate = clearingDue
    ? new Date(clearingDue.getTime() - 24 * 60 * 60 * 1000) // 1 day before due
    : null;

  await prisma.cheque.create({
    data: {
      chequeNumber: parsed.chequeNumber,
      amount: parsed.amount,
      issueDate: parsed.issueDate ? new Date(parsed.issueDate) : null,
      clearingDue,
      reminderDate,
      direction: "outgoing",
      status: "issued",
      recipientName: parsed.recipientName,
      bankAccountId: bank.id,
      entityId: ctx.entityId,
    },
  });

  revalidatePath("/cheques");
  revalidatePath("/");
}
