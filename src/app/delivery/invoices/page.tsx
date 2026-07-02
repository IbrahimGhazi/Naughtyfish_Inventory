import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { pkr, dateShort } from "@/lib/format";
import { PageHeader, PrimaryButton, Card, StatusChip, BackLink, Th } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Every invoice this delivery user created — view, print, photo status. */
export default async function DeliveryInvoicesPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "delivery");

  const invoices = await prisma.invoice.findMany({
    where: { ...entityScope(ctx), createdById: ctx.user.id },
    include: {
      party: { select: { name: true } },
      deliveryRecords: {
        orderBy: { version: "desc" },
        take: 1,
        select: { optionalPhoto: true },
      },
    },
    orderBy: { invoiceNumber: "desc" },
  });

  return (
    <div className="mx-auto max-w-[900px] animate-rise space-y-4 px-6 pb-14 pt-7">
      <div>
        <BackLink href="/delivery">← Delivery home</BackLink>
        <PageHeader
          eyebrow="Delivery"
          title="My invoices"
          subtitle="Only invoices you entered. Open one to print it or attach the delivered-package photo."
          action={
            <PrimaryButton href="/delivery/new">
              <span className="text-base leading-none">+</span> New invoice
            </PrimaryButton>
          }
        />
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-faint">No invoices yet.</p>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Invoice</Th>
                <Th>Party</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Photo</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-row transition-colors hover:bg-card2">
                  <td className="px-3.5 py-3">
                    <Link href={`/invoices/${inv.id}`} className="block">
                      <span className="text-[13.5px] font-semibold text-ink">#{inv.invoiceNumber}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-gold">
                        {inv.referenceNumber ?? "—"}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text">
                    <Link href={`/invoices/${inv.id}`} className="block">{inv.party.name}</Link>
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-muted">
                    <Link href={`/invoices/${inv.id}`} className="block">{dateShort(inv.date)}</Link>
                  </td>
                  <td className="px-3.5 py-3">
                    <Link href={`/invoices/${inv.id}`} className="block">
                      <StatusChip status={inv.status} label={inv.status === "draft" ? "awaiting review" : undefined} />
                    </Link>
                  </td>
                  <td className="px-3.5 py-3 text-[13px]">
                    <Link href={`/invoices/${inv.id}`} className="block">
                      {inv.deliveryRecords[0]?.optionalPhoto ? (
                        <span title="photo attached">📷 ✓</span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <Link href={`/invoices/${inv.id}`} className="block font-mono text-[13px] font-semibold text-ink">
                      {pkr(Number(inv.totalAmount))}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-hair2 bg-card2 px-3.5 py-2.5 text-xs text-muted">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
          </div>
        </Card>
      )}
    </div>
  );
}
