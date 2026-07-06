import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage, canView } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { priorPaidAgainstInvoice, invoiceOutstanding } from "@/lib/payments";
import { getAppConfig, getCopy } from "@/lib/config";
import { BackLink } from "@/components/ui";
import PaymentForm, { type FormInvoice, type FormPurchase, type FormBank } from "./PaymentForm";

export const dynamic = "force-dynamic";

export default async function RecordPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ purchase?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getActiveContext();
  requirePage(ctx, "parties");
  const t = await getCopy();
  const scope = entityScope(ctx);

  const party = await prisma.party.findFirst({ where: { id, ...scope } });
  if (!party) notFound();
  const cfg = await getAppConfig();
  // Purchase data is only fetched (and the supplier purchase-mode only shown)
  // when the module is enabled AND this role holds the purchases grant —
  // otherwise the module would be readable through a parties-granted page.
  const purchaseMode =
    party.partyType === "supplier" &&
    cfg.features.purchases &&
    canView(ctx, "purchases");

  const [invoices, purchases, banks] = await Promise.all([
    party.partyType === "supplier"
      ? Promise.resolve([])
      : prisma.invoice.findMany({
          where: { ...scope, partyId: id },
          include: { payments: { select: { amount: true } } },
          orderBy: { invoiceNumber: "desc" },
        }),
    purchaseMode
      ? prisma.purchase.findMany({
          where: { ...scope, partyId: id },
          include: { payments: { select: { amount: true } } },
          orderBy: { purchaseNumber: "desc" },
        })
      : Promise.resolve([]),
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

  const formPurchases: FormPurchase[] = purchases.map((pur) => {
    const total = Number(pur.totalAmount);
    const priorPaid = priorPaidAgainstInvoice(
      pur.payments.map((p) => ({ amount: Number(p.amount) })),
    );
    return {
      id: pur.id,
      reference: pur.reference,
      supplierBillNo: pur.supplierBillNo,
      date: pur.date.toISOString(),
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
          {t("parties.payment.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {[party.partyType, party.subType, party.channel].filter(Boolean).join(" · ")}
          {t("parties.payment.appearsHint")}
        </p>
      </div>

      <PaymentForm
        partyId={id}
        invoices={formInvoices}
        banks={formBanks}
        purchases={formPurchases}
        isSupplier={purchaseMode}
        defaultPurchaseId={sp.purchase && formPurchases.some((p) => p.id === sp.purchase) ? sp.purchase : ""}
      />
    </div>
  );
}
