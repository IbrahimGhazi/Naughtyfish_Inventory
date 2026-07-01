import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { pkr, dateShort } from "@/lib/format";
import { PageHeader, PrimaryButton, Card, Chip, StatusChip, Th } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const ctx = await getActiveContext();
  const invoices = await prisma.invoice.findMany({
    where: entityScope(ctx),
    include: { party: true, payments: { select: { amount: true } } },
    orderBy: { invoiceNumber: "desc" },
  });

  const balanceOf = (inv: (typeof invoices)[number]) =>
    Number(inv.totalAmount) -
    inv.payments.reduce((s, p) => s + Number(p.amount), 0);

  const outstanding = invoices.reduce(
    (sum, inv) => sum + Math.max(0, balanceOf(inv)),
    0,
  );

  return (
    <div className="animate-rise space-y-4">
      <PageHeader
        eyebrow="Sales"
        title="Invoices"
        action={
          <PrimaryButton href="/invoices/new">
            <span className="text-base leading-none">+</span> New invoice
          </PrimaryButton>
        }
      />

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
                <Th align="right">Balance due</Th>
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const due = balanceOf(inv);
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-row transition-colors hover:bg-card2"
                  >
                    <td className="px-3.5 py-3">
                      <Link href={`/invoices/${inv.id}`} className="block">
                        <div className="text-[13.5px] font-semibold text-ink">
                          #{inv.invoiceNumber}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-gold">
                          {inv.referenceNumber ?? "—"}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3.5 py-3 text-[13.5px] text-text">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="inline-flex items-center gap-2"
                      >
                        {inv.party.name}
                        <Chip tone="neutral" className="uppercase">
                          {inv.channel}
                        </Chip>
                      </Link>
                    </td>
                    <td className="px-3.5 py-3 text-[13px] text-muted">
                      <Link href={`/invoices/${inv.id}`} className="block">
                        {dateShort(inv.date)}
                      </Link>
                    </td>
                    <td className="px-3.5 py-3">
                      <Link href={`/invoices/${inv.id}`} className="block">
                        <StatusChip status={inv.status} />
                      </Link>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <Link href={`/invoices/${inv.id}`} className="block">
                        <span
                          className={`font-mono text-[13px] ${due > 0 ? "text-neg" : "text-muted"}`}
                        >
                          {pkr(due)}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <Link href={`/invoices/${inv.id}`} className="block">
                        <span className="font-mono text-[13px] font-semibold text-ink">
                          {pkr(Number(inv.totalAmount))}
                        </span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex justify-between border-t border-hair2 bg-card2 px-3.5 py-2.5 text-xs text-muted">
            <span>
              {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
            </span>
            <span className="font-mono">outstanding {pkr(outstanding)}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
