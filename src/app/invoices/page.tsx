import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { pkr, dateShort } from "@/lib/format";
import { PageHeader, PrimaryButton, Card, Chip, StatusChip, Th } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await getActiveContext();
  requirePage(ctx, "invoices");
  const { status } = await searchParams;
  const draftsOnly = status === "draft";

  const [invoices, draftCount] = await Promise.all([
    prisma.invoice.findMany({
      where: { ...entityScope(ctx), ...(draftsOnly ? { status: "draft" } : {}) },
      include: { party: true, payments: { select: { amount: true } } },
      orderBy: { invoiceNumber: "desc" },
    }),
    prisma.invoice.count({ where: { ...entityScope(ctx), status: "draft" } }),
  ]);

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
        title={draftsOnly ? "Invoices · drafts to review" : "Invoices"}
        action={
          <PrimaryButton href="/invoices/new">
            <span className="text-base leading-none">+</span> New invoice
          </PrimaryButton>
        }
      />

      {/* Field-entered drafts waiting for office approval. */}
      {draftCount > 0 && !draftsOnly && (
        <Link
          href="/invoices?status=draft"
          className="block rounded-xl border px-4 py-3 text-[13px] transition-colors hover:brightness-[0.98]"
          style={{ borderColor: "var(--warn)", background: "var(--warn-bg)", color: "var(--warn)" }}
        >
          <strong>{draftCount} draft{draftCount === 1 ? "" : "s"}</strong> from the delivery login
          {draftCount === 1 ? " is" : " are"} waiting for review — tap to see {draftCount === 1 ? "it" : "them"}.
        </Link>
      )}
      {draftsOnly && (
        <Link
          href="/invoices"
          className="inline-block text-[12.5px] font-semibold text-gold hover:text-accent-deep"
        >
          ← Show all invoices
        </Link>
      )}

      {invoices.length === 0 ? (
        <p className="text-sm text-faint">{draftsOnly ? "No drafts awaiting review." : "No invoices yet."}</p>
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
