import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { priorPaidAgainstInvoice, invoiceOutstanding } from "@/lib/payments";
import PaymentForm, { type FormInvoice, type FormBank } from "./PaymentForm";

export const dynamic = "force-dynamic";

export default async function RecordPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveContext();
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
    <div className="space-y-5">
      <div>
        <Link href={`/parties/${id}`} className="text-xs text-slate-400 hover:text-cyan-700 dark:text-slate-500 dark:hover:text-cyan-400">
          ← {party.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Record payment</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {[party.partyType, party.subType, party.channel].filter(Boolean).join(" · ")}
          . Payment appears on the party ledger automatically.
        </p>
      </div>

      <PaymentForm partyId={id} invoices={formInvoices} banks={formBanks} />
    </div>
  );
}
