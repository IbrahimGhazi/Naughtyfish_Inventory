import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { pkr, kg, pct, dateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  submitted: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  edited: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  printed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveContext();

  const invoice = await prisma.invoice.findFirst({
    where: { id, ...entityScope(ctx) },
    include: {
      party: true,
      sourceStore: true,
      lineItems: { include: { item: true } },
      payments: { include: { cheque: true }, orderBy: { date: "asc" } },
      deliveryRecords: { orderBy: { version: "desc" } },
    },
  });
  if (!invoice) notFound();

  const total = Number(invoice.totalAmount);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/invoices" className="text-xs text-slate-400 hover:text-cyan-700 dark:text-slate-500 dark:hover:text-cyan-400">
            ← Invoices
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            Invoice #{invoice.invoiceNumber}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {invoice.referenceNumber ? (
              <span className="font-mono">{invoice.referenceNumber} · </span>
            ) : null}
            <Link href={`/parties/${invoice.partyId}`} className="hover:text-cyan-700 dark:hover:text-cyan-400">
              {invoice.party.name}
            </Link>
            {" · "}
            {dateShort(invoice.date)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/invoices/${invoice.id}/edit`}
            data-testid="edit-invoice"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Edit
          </Link>
          <Link
            href={`/invoices/${invoice.id}/print`}
            data-testid="print-invoice"
            className="rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800"
          >
            Print
          </Link>
        </div>
      </div>

      {/* Meta card */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <Meta label="Channel">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase dark:bg-slate-800 dark:text-slate-300">
            {invoice.channel}
          </span>
        </Meta>
        <Meta label="Status">
          <span
            className={`rounded px-1.5 py-0.5 text-xs uppercase ${
              STATUS_STYLES[invoice.status] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {invoice.status}
          </span>
        </Meta>
        <Meta label="Version">v{invoice.version}</Meta>
        <Meta label="Source store">{invoice.sourceStore?.name ?? "—"}</Meta>
      </div>

      {/* Line items */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
            <tr>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2 text-right">Gross</th>
              <th className="px-4 py-2 text-right">Final / net</th>
              <th className="px-4 py-2 text-right">Glazing %</th>
              <th className="px-4 py-2 text-right">Rate / kg</th>
              <th className="px-4 py-2 text-right">Cartons</th>
              <th className="px-4 py-2 text-right">Packets</th>
              <th className="px-4 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoice.lineItems.map((li) => (
              <tr key={li.id}>
                <td className="px-4 py-2">{li.item.name}</td>
                <td className="px-4 py-2 text-right">{kg(Number(li.grossWeightKg))}</td>
                <td className="px-4 py-2 text-right">{kg(Number(li.netWeightKg))}</td>
                <td className="px-4 py-2 text-right">{pct(Number(li.glazingPct))}</td>
                <td className="px-4 py-2 text-right">{pkr(Number(li.ratePerKg))}</td>
                <td className="px-4 py-2 text-right">{li.cartonCount ?? "—"}</td>
                <td className="px-4 py-2 text-right">{li.packetCount ?? "—"}</td>
                <td className="px-4 py-2 text-right font-medium">{pkr(Number(li.amount))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <td colSpan={7} className="px-4 py-2 text-right text-xs uppercase text-slate-400 dark:text-slate-500">
                Total
              </td>
              <td className="px-4 py-2 text-right text-base font-semibold">{pkr(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {invoice.notes && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs uppercase text-slate-400 dark:text-slate-500">Notes</div>
          <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-200">{invoice.notes}</p>
        </div>
      )}

      {/* Payments recorded against this invoice */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Payments against this invoice</h2>
        {invoice.payments.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">None recorded.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Detail</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoice.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{dateShort(p.date)}</td>
                    <td className="px-4 py-2 capitalize">{p.type}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                      {p.type === "cheque" && p.cheque
                        ? `Cheque ${p.cheque.chequeNumber}`
                        : p.note ?? "—"}
                      {p.isPartial && (
                        <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          partial
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">{pkr(Number(p.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delivery-record version history — the dispute-defense trail. */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          Delivery record history
          <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">· append-only dispute defense</span>
        </h2>
        {invoice.deliveryRecords.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No delivery records.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
                <tr>
                  <th className="px-4 py-2">Version</th>
                  <th className="px-4 py-2">Delivered at</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoice.deliveryRecords.map((dr) => (
                  <tr key={dr.id}>
                    <td className="px-4 py-2">
                      v{dr.version}
                      {dr.supersedesId === null && (
                        <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          original
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {new Date(dr.deliveredAt).toLocaleString("en-PK")}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {pkr(Number(dr.totalAmount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-400 dark:text-slate-500">{label}</div>
      <div className="mt-0.5 text-slate-700 dark:text-slate-200">{children}</div>
    </div>
  );
}
