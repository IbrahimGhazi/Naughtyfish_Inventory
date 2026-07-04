"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertRole, OFFICE_ROLES } from "@/lib/roles";
import { entityScope, assertEntityAccess } from "@/lib/scope";
import { requireFeature } from "@/lib/config";
import { priorPaidAgainstInvoice, isPartialPayment } from "@/lib/payments";
import { revalidatePath } from "next/cache";

const PaymentSchema = z
  .object({
    partyId: z.string().min(1),
    type: z.enum(["cash", "transfer", "cheque"]),
    amount: z.coerce.number().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.").optional(),
    invoiceId: z.string().optional(),
    purchaseId: z.string().optional(),
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
  )
  .refine((v) => !(v.invoiceId && v.purchaseId), {
    message: "A payment can settle an invoice or a purchase, not both.",
    path: ["purchaseId"],
  });

export type CreatePaymentInput = z.infer<typeof PaymentSchema>;

export async function createPayment(input: CreatePaymentInput, clientId?: string) {
  const ctx = await getActiveContext();
  assertRole(ctx, OFFICE_ROLES);
  await assertEntityAccess(ctx);

  const parsed = PaymentSchema.parse(input);
  const scope = entityScope(ctx);

  // Idempotent replay of an offline-queued payment: the client generated the
  // row id, so if it already exists this sync already landed — return it as-is
  // instead of double-posting. (Online callers pass no clientId → unchanged.)
  if (clientId) {
    const existing = await prisma.payment.findUnique({
      where: { id: clientId },
      select: { id: true, isPartial: true },
    });
    if (existing) return { id: existing.id, isPartial: existing.isPartial };
  }

  // Party must be in the active book.
  const party = await prisma.party.findFirst({ where: { id: parsed.partyId, ...scope } });
  if (!party) throw new Error("Party is not in the active book.");

  // Same convention as purchases (local noon) so a charge and its same-day
  // payment sort charge-first in the ledger instead of straddling midnight UTC.
  const date = parsed.date ? new Date(`${parsed.date}T12:00:00`) : new Date();

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

  // Optional purchase link (supplier payments): same shape as the invoice link.
  if (parsed.purchaseId) {
    await requireFeature("purchases");
    const purchase = await prisma.purchase.findFirst({
      where: { id: parsed.purchaseId, partyId: parsed.partyId, ...scope },
    });
    if (!purchase) throw new Error("Purchase does not belong to this party.");

    const priorPayments = await prisma.payment.findMany({
      where: { purchaseId: purchase.id, ...scope },
      select: { amount: true },
    });
    const priorPaid = priorPaidAgainstInvoice(
      priorPayments.map((p) => ({ amount: Number(p.amount) })),
    );
    isPartial = isPartialPayment(parsed.amount, Number(purchase.totalAmount), priorPaid);
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

      // Direction follows the money: customers hand US a cheque (incoming);
      // paying a supplier means WE issue one (outgoing, recipient = supplier).
      const outgoing = party.partyType === "supplier";
      const cheque = await tx.cheque.create({
        data: {
          chequeNumber: parsed.chequeNumber!,
          amount: parsed.amount,
          issueDate: parsed.issueDate ? new Date(parsed.issueDate) : null,
          clearingDue,
          reminderDate,
          direction: outgoing ? "outgoing" : "incoming",
          status: outgoing ? "issued" : "pending",
          recipientName: outgoing ? party.name : null,
          note: parsed.note ?? null,
          bankAccountId: bank.id,
          entityId: ctx.entityId,
        },
      });
      chequeId = cheque.id;
    }

    return tx.payment.create({
      data: {
        ...(clientId ? { id: clientId } : {}),
        type: parsed.type,
        amount: parsed.amount,
        date,
        isPartial,
        isPrecautionaryCash: parsed.type === "cash" ? !!parsed.isPrecautionaryCash : false,
        promiseOfCheque: parsed.type === "cash" ? !!parsed.promiseOfCheque : false,
        note: parsed.note ?? null,
        partyId: parsed.partyId,
        invoiceId: parsed.invoiceId || null,
        purchaseId: parsed.purchaseId || null,
        chequeId,
        entityId: ctx.entityId,
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/cheques");
  revalidatePath("/purchases");
  revalidatePath(`/parties/${parsed.partyId}`);
  return { id: created.id, isPartial };
}
