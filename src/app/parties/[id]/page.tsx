import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { buildPartyLedger } from "@/lib/ledger";
import { pkr, dateShort } from "@/lib/format";
import { BackLink, Card, Chip, PrimaryButton, Th } from "@/components/ui";

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
  requirePage(ctx, "parties");

  const party = await prisma.party.findFirst({ where: { id, ...entityScope(ctx) } });
  if (!party) notFound();

  const asOfDate = asOf ? new Date(asOf + "T23:59:59") : undefined;
  const ledger = await buildPartyLedger(ctx.entityId, id, asOfDate);

  const meta =
    [party.partyType, party.subType, party.channel].filter(Boolean).join(" · ") +
    (party.ntn ? ` · NTN ${party.ntn}` : " · no NTN (local)");

  return (
    <div className="animate-rise space-y-4">
      <div>
        <BackLink href="/parties">← All parties</BackLink>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[28px] font-semibold leading-tight text-ink">
              {party.name}
            </h1>
            <p className="mt-1 text-sm text-muted">{meta}</p>
          </div>
          <PrimaryButton href={`/parties/${id}/payment`} data-testid="record-payment">
            + Record payment
          </PrimaryButton>
        </div>
      </div>

      {/* Net outstanding summary + as-of date filter — plan §4.5 "as of 27 June, who owes me". */}
      <div className="flex flex-wrap items-stretch gap-3.5">
        <Card className="flex flex-1 items-center justify-between gap-4 p-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint2">
              Net outstanding{asOf ? ` (as of ${dateShort(asOfDate!)})` : ""}
            </div>
            <div className="mt-1 text-[11.5px] text-muted">
              opening balance {pkr(ledger.opening)} · positive = party owes us
            </div>
          </div>
          <div
            className={`font-mono text-2xl font-semibold ${
              ledger.netOutstanding > 0 ? "text-neg" : "text-pos"
            }`}
          >
            {pkr(ledger.netOutstanding)}
          </div>
        </Card>

        <form className="shrink-0" action={`/parties/${id}`}>
          <label>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
              As of date
            </div>
            <div className="flex gap-1.5">
              <input type="date" name="asOf" defaultValue={asOf} className="input" />
              <button className="rounded-lg border border-hair bg-card px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-card2">
                Apply
              </button>
              {asOf && (
                <Link
                  href={`/parties/${id}`}
                  className="inline-flex items-center px-2 text-[12.5px] font-semibold text-muted hover:text-accent-deep"
                >
                  clear
                </Link>
              )}
            </div>
          </label>
        </form>
      </div>

      {/* Paper ledger table. */}
      <Card className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th className="w-[90px]">Date</Th>
              <Th>Detail</Th>
              <Th align="right">Debit</Th>
              <Th align="right">Credit</Th>
              <Th align="right">Balance</Th>
            </tr>
          </thead>
          <tbody>
            {ledger.rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3.5 py-6 text-center text-sm text-faint">
                  No activity.
                </td>
              </tr>
            ) : (
              ledger.rows.map((r, i) => (
                <tr key={i} className="border-b border-row transition-colors hover:bg-card2">
                  <td className="px-3.5 py-3 font-mono text-[12.5px] text-muted">
                    {dateShort(r.date)}
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-text">
                    <Chip tone={r.kind === "invoice" ? "accent" : "pos"} className="mr-2">
                      {r.kind}
                    </Chip>
                    {r.ref}
                    {r.meta && <span className="ml-1 text-[12px] text-muted">· {r.meta}</span>}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-[12.5px] text-neg">
                    {r.debit ? pkr(r.debit) : ""}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-[12.5px] text-pos">
                    {r.credit ? pkr(r.credit) : ""}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-[12.5px] font-semibold text-ink">
                    {pkr(r.balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
