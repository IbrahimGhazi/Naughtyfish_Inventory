import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { buildPartyLedger } from "@/lib/ledger";
import { pkr, dateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PartyLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ asOf?: string }>;
}) {
  const { id } = await params;
  const { asOf } = await searchParams;
  const ctx = await getActiveContext();

  const party = await prisma.party.findFirst({ where: { id, ...entityScope(ctx) } });
  if (!party) notFound();

  const asOfDate = asOf ? new Date(asOf + "T23:59:59") : undefined;
  const ledger = await buildPartyLedger(ctx.entityId, id, asOfDate);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/parties" className="text-xs text-slate-400 hover:text-cyan-700 dark:text-slate-500 dark:hover:text-cyan-400">← Parties</Link>
          <h1 className="mt-1 text-xl font-semibold">{party.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {[party.partyType, party.subType, party.channel].filter(Boolean).join(" · ")}
            {party.ntn ? ` · NTN ${party.ntn}` : " · no NTN (local)"}
          </p>
        </div>
        <Link
          href={`/parties/${id}/payment`}
          data-testid="record-payment"
          className="shrink-0 rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800"
        >
          + Record payment
        </Link>
      </div>

      {/* As-of date filter — plan §4.5 "as of 27 June, who owes me". */}
      <form className="flex items-end gap-2 text-sm" action={`/parties/${id}`}>
        <label className="text-xs text-slate-500 dark:text-slate-400">
          As of date
          <input type="date" name="asOf" defaultValue={asOf} className="input mt-1" />
        </label>
        <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Apply</button>
        {asOf && <Link href={`/parties/${id}`} className="px-2 py-1.5 text-slate-400 dark:text-slate-500">clear</Link>}
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Net outstanding{asOf ? ` (as of ${dateShort(asOfDate!)})` : ""}
          </span>
          <span className={`text-lg font-semibold ${ledger.netOutstanding > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {pkr(ledger.netOutstanding)}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Positive = party owes us. Opening balance {pkr(ledger.opening)}.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Detail</th>
              <th className="px-4 py-2 text-right">Debit</th>
              <th className="px-4 py-2 text-right">Credit</th>
              <th className="px-4 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {ledger.rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">No activity.</td></tr>
            ) : (
              ledger.rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{dateShort(r.date)}</td>
                  <td className="px-4 py-2">
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${r.kind === "invoice" ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>
                      {r.kind}
                    </span>
                    {r.ref}
                    {r.meta && <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">· {r.meta}</span>}
                  </td>
                  <td className="px-4 py-2 text-right">{r.debit ? pkr(r.debit) : ""}</td>
                  <td className="px-4 py-2 text-right">{r.credit ? pkr(r.credit) : ""}</td>
                  <td className="px-4 py-2 text-right font-medium">{pkr(r.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
