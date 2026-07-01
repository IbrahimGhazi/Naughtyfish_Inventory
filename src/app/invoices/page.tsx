import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { pkr, dateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const ctx = await getActiveContext();
  const invoices = await prisma.invoice.findMany({
    where: entityScope(ctx),
    include: { party: true },
    orderBy: { invoiceNumber: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Invoices</h1>
        <Link href="/invoices/new" className="rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800">
          + New Invoice
        </Link>
      </div>
      {invoices.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No invoices yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">Party</th>
                <th className="px-4 py-2">Channel</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-2 font-mono">
                    <Link href={`/invoices/${inv.id}`} className="text-cyan-700 hover:underline dark:text-cyan-400">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-mono text-slate-500 dark:text-slate-400">
                    <Link href={`/invoices/${inv.id}`} className="hover:text-cyan-700 dark:hover:text-cyan-400">
                      {inv.referenceNumber ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/parties/${inv.partyId}`} className="hover:text-cyan-700 dark:hover:text-cyan-400">{inv.party.name}</Link>
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase dark:bg-slate-800 dark:text-slate-300">{inv.channel}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{dateShort(inv.date)}</td>
                  <td className="px-4 py-2 text-right font-medium">{pkr(Number(inv.totalAmount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
