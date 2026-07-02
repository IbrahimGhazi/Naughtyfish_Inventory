"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertRole, OFFICE_ROLES } from "@/lib/roles";
import { entityScope, assertEntityAccess } from "@/lib/scope";
import { priorPaidAgainstInvoice, isPartialPayment } from "@/lib/payments";
import { revalidatePath } from "next/cache";

const PaymentSchema = z
  .object({
    partyId: z.string().min(1),
    type: z.enum(["cash", "transfer", "cheque"]),
    amount: z.coerce.number().positive(),
    date: z.string().optional(),
    invoiceId: z.string().optional(),
    note: z.string().optional(),
    promiseOfCheque: z.coerce.boolean().optional(),
    isPrecautionaryCash: z.coerce.boolean().optional(),
    chequeNumber: z.string().optional(),
    bankAccountId: z.string().optional(),
    issueDate: z.string().optional(),
    clearingDue: z.string().optional(),
  })
  .refine((v) => v.type !== "cash" || (v.note && v.note.trim().length > 0), {
    message: "Cash payments require a note (the tape: cash is recorded as proof).",
    path: ["note"],
  })
  .refine(
    (v) => v.type !== "cheque" || (!!v.chequeNumber && !!v.bankAccountId),
    {
      message: "Cheque payments require a cheque number and a bank account.",
      path: ["chequeNumber"],
    },
  );

export type CreatePaymentInput = z.infer<typeof PaymentSchema>;

export async function createPayment(input: CreatePaymentInput) {
  const ctx = await getActiveContext();
  assertRole(ctx, OFFICE_ROLES);
  await assertEntityAccess(ctx);

  const parsed = PaymentSchema.parse(input);
  const scope = entityScope(ctx);

  // Party must be in the active book.
  const party = await prisma.party.findFirst({ where: { id: parsed.partyId, ...scope } });
  if (!party) throw new Error("Party is not in the active book.");

  const date = parsed.date ? new Date(parsed.date) : new Date();

  // Optional invoice link: must belong to this party (and book). Compute isPartial.
  let isPartial = false;
  if (parsed.invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: parsed.invoiceId, partyId: parsed.partyId, ...scope },
    });
    if (!invoice) throw new Error("Invoice does not belong to this party.");

    const priorPayments = await prisma.payment.findMany({
      where: { invoiceId: invoice.id, ...scope },
      select: { amount: true },
    });
    const priorPaid = priorPaidAgainstInvoice(
      priorPayments.map((p) => ({ amount: Number(p.amount) })),
    );
    isPartial = isPartialPayment(parsed.amount, Number(invoice.totalAmount), priorPaid);
  }

  const created = await prisma.$transaction(async (tx) => {
    let chequeId: string | null = null;

    if (parsed.type === "cheque") {
      // Cheque payment must reference a bank account in the active book.
      const bank = await tx.bankAccount.findFirst({
        where: { id: parsed.bankAccountId!, ...scope },
      });
      if (!bank) throw new Error("Bank account is not in the active book.");

      const clearingDue = parsed.clearingDue ? new Date(parsed.clearingDue) : null;
      const reminderDate = clearingDue
        ? new Date(clearingDue.getTime() - 24 * 60 * 60 * 1000) // 1 day before due
        : null;

      const cheque = await tx.cheque.create({
        data: {
          chequeNumber: parsed.chequeNumber!,
          amount: parsed.amount,
          issueDate: parsed.issueDate ? new Date(parsed.issueDate) : null,
          clearingDue,
          reminderDate,
          direction: "incoming",
          status: "pending",
          note: parsed.note ?? null,
          bankAccountId: bank.id,
          entityId: ctx.entityId,
        },
      });
      chequeId = cheque.id;
    }

    return tx.payment.create({
      data: {
        type: parsed.type,
        amount: parsed.amount,
        date,
        isPartial,
        isPrecautionaryCash: parsed.type === "cash" ? !!parsed.isPrecautionaryCash : false,
        promiseOfCheque: parsed.type === "cash" ? !!parsed.promiseOfCheque : false,
        note: parsed.note ?? null,
        partyId: parsed.partyId,
        invoiceId: parsed.invoiceId || null,
        chequeId,
        entityId: ctx.entityId,
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/cheques");
  revalidatePath(`/parties/${parsed.partyId}`);
  return { id: created.id, isPartial };
}
