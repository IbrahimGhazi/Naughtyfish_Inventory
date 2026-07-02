import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { priorPaidAgainstInvoice, invoiceOutstanding } from "@/lib/payments";
import { BackLink } from "@/components/ui";
import PaymentForm, { type FormInvoice, type FormBank } from "./PaymentForm";

export const dynamic = "force-dynamic";

export default async function RecordPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveContext();
  requirePage(ctx, "parties");
  const scope = entityScope(ctx);

  const party = await prisma.party.findFirst({ where: { id, ...scope } });
  if (!party) notFound();

  const [invoices, banks] = await Promise.all([
    prisma.invoice.findMany({
      where: { ...scope, partyId: id },
      include: { payments: { select: { amount: true } } },
      orderBy: { invoiceNumber: "desc" },
    }),
    prisma.bankAccount.findMany({ where: scope, orderBy: { bankName: "asc" } }),
  ]);

  const formInvoices: FormInvoice[] = invoices.map((inv) => {
    const total = Number(inv.totalAmount);
    const priorPaid = priorPaidAgainstInvoice(
      inv.payments.map((p) => ({ amount: Number(p.amount) })),
    );
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      referenceNumber: inv.referenceNumber,
      date: inv.date.toISOString(),
      total,
      outstanding: invoiceOutstanding(total, priorPaid),
    };
  });

  const formBanks: FormBank[] = banks.map((b) => ({
    id: b.id,
    label: `${b.bankName} · ${b.accountName}`,
  }));

  return (
    <div className="animate-rise space-y-5">
      <div>
        <BackLink href={`/parties/${id}`}>← {party.name}</BackLink>
        <h1 className="font-serif text-[28px] font-semibold leading-tight text-ink">
          Record payment
        </h1>
        <p className="mt-1 text-sm text-muted">
          {[party.partyType, party.subType, party.channel].filter(Boolean).join(" · ")}
          . Payment appears on the party ledger automatically.
        </p>
      </div>

      <PaymentForm partyId={id} invoices={formInvoices} banks={formBanks} />
    </div>
  );
}
