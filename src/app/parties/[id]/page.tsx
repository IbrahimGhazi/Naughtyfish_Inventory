import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage, canView } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { buildPartyLedger } from "@/lib/ledger";
import { getCopy, getAppConfig } from "@/lib/config";
import { pkr, dateShort } from "@/lib/format";
import { BackLink, Card, Chip, PrimaryButton, Th } from "@/components/ui";
import SharePdfButton from "@/components/SharePdfButton";
import type { StatementPdfData } from "@/lib/pdf/types";

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
  const t = await getCopy();

  const party = await prisma.party.findFirst({ where: { id, ...entityScope(ctx) } });
  if (!party) notFound();

  const asOfDate = asOf ? new Date(asOf + "T23:59:59") : undefined;
  // Roles without the purchases grant must not read purchase rows through the
  // party ledger (their supplier balances render without purchase charges).
  const ledger = await buildPartyLedger(ctx.entityId, id, asOfDate, {
    includePurchases: canView(ctx, "purchases"),
  });

  const meta =
    [party.partyType, party.subType, party.channel].filter(Boolean).join(" · ") +
    (party.ntn ? ` · NTN ${party.ntn}` : " · no NTN (local)");

  const contactLine = [party.contactPerson, party.phone, party.email]
    .filter(Boolean)
    .join(" · ");

  const cfg = await getAppConfig();
  const statementPdf: StatementPdfData = {
    businessName: cfg.branding.appName,
    partyName: party.name,
    partyMeta: meta,
    asOfISO: asOfDate ? asOfDate.toISOString() : null,
    opening: ledger.opening,
    rows: ledger.rows.map((r) => ({
      dateISO: r.date.toISOString(),
      kind: r.kind,
      ref: r.ref,
      meta: r.meta ?? null,
      debit: r.debit,
      credit: r.credit,
      balance: r.balance,
    })),
    netOutstanding: ledger.netOutstanding,
  };

  return (
    <div className="animate-rise space-y-4">
      <div>
        <BackLink href={party.partyType === "supplier" ? "/parties/suppliers" : "/parties/customers"}>
          {party.partyType === "supplier" ? t("parties.ledger.backSuppliers") : t("parties.ledger.backCustomers")}
        </BackLink>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[28px] font-semibold leading-tight text-ink">
              {party.name}
            </h1>
            <p className="mt-1 text-sm text-muted">{meta}</p>
            {contactLine && (
              <p className="mt-0.5 text-[12.5px] text-faint">Contact: {contactLine}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SharePdfButton
              kind="statement"
              payload={statementPdf}
              filename={`Statement-${party.name.replace(/[^\w-]+/g, "_")}.pdf`}
              shareText={`${cfg.branding.appName} — account statement for ${party.name}`}
              testid="share-statement"
            />
            <PrimaryButton href={`/parties/${id}/payment`} data-testid="record-payment">
              {t("parties.ledger.recordPayment")}
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* Net outstanding summary + as-of date filter — plan §4.5 "as of 27 June, who owes me". */}
      <div className="flex flex-wrap items-stretch gap-3.5">
        <Card className="flex flex-1 items-center justify-between gap-4 p-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint2">
              {t("parties.ledger.netOutstanding")}{asOf ? ` (as of ${dateShort(asOfDate!)})` : ""}
            </div>
            <div className="mt-1 text-[11.5px] text-muted">
              {t("parties.ledger.openingBalance")} {pkr(ledger.opening)} · {t("parties.ledger.positiveOwes")}
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
              {t("parties.ledger.asOfDate")}
            </div>
            <div className="flex gap-1.5">
              <input type="date" name="asOf" defaultValue={asOf} className="input" />
              <button className="rounded-lg border border-hair bg-card px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-card2">
                {t("parties.ledger.apply")}
              </button>
              {asOf && (
                <Link
                  href={`/parties/${id}`}
                  className="inline-flex items-center px-2 text-[12.5px] font-semibold text-muted hover:text-accent-deep"
                >
                  {t("parties.ledger.clear")}
                </Link>
              )}
            </div>
          </label>
        </form>
      </div>

      {/* Paper ledger table. */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th className="w-[90px]">{t("parties.ledger.colDate")}</Th>
              <Th>{t("parties.ledger.colDetail")}</Th>
              <Th align="right">{t("parties.ledger.colDebit")}</Th>
              <Th align="right">{t("parties.ledger.colCredit")}</Th>
              <Th align="right">{t("parties.ledger.colBalance")}</Th>
            </tr>
          </thead>
          <tbody>
            {ledger.rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3.5 py-6 text-center text-sm text-faint">
                  {t("parties.ledger.noActivity")}
                </td>
              </tr>
            ) : (
              ledger.rows.map((r, i) => (
                <tr key={i} className="border-b border-row transition-colors hover:bg-card2">
                  <td className="px-3.5 py-3 font-mono text-[12.5px] text-muted">
                    {dateShort(r.date)}
                  </td>
                  <td className="px-3.5 py-3 text-[13px] text-text">
                    <Chip
                      tone={r.kind === "invoice" ? "accent" : r.kind === "purchase" ? "warn" : "pos"}
                      className="mr-2"
                    >
                      {r.kind}
                    </Chip>
                    {r.href ? (
                      <Link href={r.href} className="font-semibold text-accent-deep hover:underline">
                        {r.ref}
                      </Link>
                    ) : (
                      r.ref
                    )}
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
        </div>
      </Card>
    </div>
  );
}
