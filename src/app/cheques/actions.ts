"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { assertRole, OFFICE_ROLES } from "@/lib/roles";
import { entityScope, assertEntityAccess } from "@/lib/scope";
import { requireFeature } from "@/lib/config";
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
  assertRole(ctx, OFFICE_ROLES);
  await assertEntityAccess(ctx);
  await requireFeature("cheques");
  const parsed = StatusSchema.parse(input);
  const scope = entityScope(ctx);

  const cheque = await prisma.cheque.findFirst({
    where: { id: parsed.chequeId, ...scope },
    include: { payments: true },
  });
  if (!cheque) throw new Error("Cheque is not in the active book.");

  if (cheque.status === "cleared") {
    throw new Error("Cleared cheques are terminal and cannot change status.");
  }
  const allowed = TRANSITIONS[cheque.status] ?? [];
  if (!allowed.includes(parsed.status)) {
    throw new Error(`Cannot move a cheque from "${cheque.status}" to "${parsed.status}".`);
  }

  // A bounced cheque's money never arrived — the linked payment must stop
  // crediting the party's ledger (otherwise the app itself produces the
  // "we already paid you" dispute it exists to defend). Append-only: we add
  // offsetting reversal rows, never delete. Un-bouncing (re-presented and
  // honored) appends a re-instatement row. `net` guards idempotency.
  const net = cheque.payments.reduce((s, p) => s + Number(p.amount), 0);
  const positives = cheque.payments.filter((p) => Number(p.amount) > 0);
  const first = positives[0];

  await prisma.$transaction(async (tx) => {
    if (parsed.status === "bounced" && net > 0 && first) {
      const invoiceIds = new Set(positives.map((p) => p.invoiceId ?? null));
      // Reversals must carry the SAME document links as the payments they
      // offset — an unlinked reversal would leave the invoice/purchase reading
      // "settled" while the party ledger shows the debt restored.
      const purchaseIds = new Set(positives.map((p) => p.purchaseId ?? null));
      await tx.payment.create({
        data: {
          type: "cheque",
          amount: -net,
          partyId: first.partyId,
          invoiceId: invoiceIds.size === 1 ? first.invoiceId : null,
          purchaseId: purchaseIds.size === 1 ? first.purchaseId : null,
          chequeId: cheque.id,
          entityId: ctx.entityId,
          note: `Reversal — cheque ${cheque.chequeNumber} bounced`,
        },
      });
    } else if (
      cheque.status === "bounced" &&
      parsed.status !== "bounced" &&
      net <= 0 &&
      first
    ) {
      // Target: the party ends up credited exactly the cheque amount once,
      // regardless of how many bounce/re-present cycles happened before.
      const reinstate = Number(cheque.amount) - net;
      if (reinstate > 0) {
        const invoiceIds = new Set(positives.map((p) => p.invoiceId ?? null));
        const purchaseIds = new Set(positives.map((p) => p.purchaseId ?? null));
        await tx.payment.create({
          data: {
            type: "cheque",
            amount: reinstate,
            partyId: first.partyId,
            invoiceId: invoiceIds.size === 1 ? first.invoiceId : null,
            purchaseId: purchaseIds.size === 1 ? first.purchaseId : null,
            chequeId: cheque.id,
            entityId: ctx.entityId,
            note: `Cheque ${cheque.chequeNumber} re-presented and honored`,
          },
        });
      }
    }

    await tx.cheque.update({
      where: { id: cheque.id },
      data: { status: parsed.status },
    });
  });

  revalidatePath("/cheques");
  revalidatePath("/purchases");
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
  assertRole(ctx, OFFICE_ROLES);
  await assertEntityAccess(ctx);
  await requireFeature("cheques");
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
