import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { canAccessPage, OFFICE_ROLES } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { pkr, kg, pct, dateShort } from "@/lib/format";
import { getCopy, getAppConfig } from "@/lib/config";
import {
  Card,
  Chip,
  StatusChip,
  BackLink,
  GhostButton,
  Th,
} from "@/components/ui";
import SharePdfButton from "@/components/SharePdfButton";
import type { InvoicePdfData } from "@/lib/pdf/types";
import { ApproveButton, PhotoSection } from "./ReviewControls";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveContext();
  const [t, cfg] = await Promise.all([getCopy(), getAppConfig()]);

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

  // Per-record exception to the role matrix: a delivery user may open ONLY the
  // invoices they created (view/print/photo) — everyone else needs the page grant.
  const isDelivery = ctx.user.role === "delivery";
  if (isDelivery) {
    if (invoice.createdById !== ctx.user.id) redirect("/delivery");
  } else if (!canAccessPage(ctx.user.role, "invoices")) {
    redirect("/");
  }
  const isOffice = OFFICE_ROLES.includes(ctx.user.role);
  const latestRecord = invoice.deliveryRecords[0] ?? null;

  const total = Number(invoice.totalAmount);
  const paid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = total - paid;
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const pdfData: InvoicePdfData = {
    businessName: cfg.branding.appName,
    invoiceNumber: invoice.invoiceNumber,
    referenceNumber: invoice.referenceNumber,
    dateISO: invoice.date.toISOString(),
    channel: invoice.channel,
    status: invoice.status,
    partyName: invoice.party.name,
    partyMeta: [invoice.party.partyType, invoice.party.ntn ? `NTN ${invoice.party.ntn}` : null]
      .filter(Boolean)
      .join(" · "),
    lines: invoice.lineItems.map((li) => ({
      itemName: li.item.name,
      grossKg: Number(li.grossWeightKg),
      netKg: Number(li.netWeightKg),
      glazingPct: Number(li.glazingPct),
      ratePerKg: Number(li.ratePerKg),
      cartonCount: li.cartonCount,
      packetCount: li.packetCount,
      amount: Number(li.amount),
    })),
    total,
    paid,
    balance,
    notes: invoice.notes,
  };

  return (
    <div className="animate-rise space-y-3.5">
      <div>
        <BackLink href={isDelivery ? "/delivery/invoices" : "/invoices"}>
          {isDelivery ? t("invoices.detail.backMine") : t("invoices.detail.backAll")}
        </BackLink>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[30px] font-semibold leading-tight text-ink">
              {t("invoices.detail.invoicePrefix")} #{invoice.invoiceNumber}
            </h1>
            <div className="mt-1.5 text-[13px] text-muted">
              {invoice.referenceNumber && (
                <>
                  <span className="font-mono text-gold">
                    {invoice.referenceNumber}
                  </span>
                  {" · "}
                </>
              )}
              {isDelivery ? (
                <span>{invoice.party.name}</span>
              ) : (
                <Link
                  href={`/parties/${invoice.partyId}`}
                  className="underline decoration-hair underline-offset-2 hover:text-accent-deep"
                >
                  {invoice.party.name}
                </Link>
              )}
              {" · "}
              {dateShort(invoice.date)}
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            {isOffice && invoice.status === "draft" && (
              <ApproveButton invoiceId={invoice.id} />
            )}
            {isOffice && (
              <GhostButton href={`/invoices/${invoice.id}/edit`}>
                <span data-testid="edit-invoice">{t("invoices.detail.edit")}</span>
              </GhostButton>
            )}
            <Link
              href={`/invoices/${invoice.id}/print`}
              data-testid="print-invoice"
              className="inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold"
              style={{ background: "var(--ink)", color: "var(--card)" }}
            >
              {t("invoices.detail.print")}
            </Link>
            <SharePdfButton
              kind="invoice"
              payload={pdfData}
              filename={`Invoice-${invoice.invoiceNumber}.pdf`}
              shareText={`${cfg.branding.appName} — Invoice #${invoice.invoiceNumber} for ${invoice.party.name}`}
              testid="share-invoice"
            />
          </div>
        </div>
      </div>

      {/* Draft banner: entered in the field, awaiting head-office review. */}
      {invoice.status === "draft" && (
        <div
          className="rounded-xl border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--warn)", background: "var(--warn-bg)", color: "var(--warn)" }}
        >
          {isOffice ? (
            <>
              <strong>{t("invoices.detail.draftFromField")}</strong>{t("invoices.detail.draftFromFieldBody")}
            </>
          ) : (
            <>
              <strong>{t("invoices.detail.awaitingApproval")}</strong>{t("invoices.detail.awaitingApprovalBody")}
            </>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
            {t("invoices.detail.cardChannel")}
          </div>
          <div className="mt-1.5">
            <Chip tone="neutral" className="uppercase">
              {invoice.channel}
            </Chip>
          </div>
        </Card>
        <Card className="p-3.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
            {t("invoices.detail.cardStatus")}
          </div>
          <div className="mt-1.5">
            <StatusChip status={invoice.status} />
          </div>
        </Card>
        <Card className="p-3.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
            {t("invoices.detail.cardVersion")}
          </div>
          <div className="mt-1.5 text-[13.5px] font-semibold text-ink">
            v{invoice.version}
          </div>
        </Card>
        <Card className="p-3.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
            {t("invoices.detail.cardSourceStore")}
          </div>
          <div className="mt-1.5 text-[13.5px] font-semibold text-ink">
            {invoice.sourceStore?.name ?? "—"}
          </div>
        </Card>
      </div>

      {/* Line items */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>{t("invoices.detail.colItem")}</Th>
              <Th align="right">{t("invoices.detail.colGross")}</Th>
              <Th align="right">{t("invoices.detail.colNet")}</Th>
              <Th align="right">{t("invoices.detail.colGlazing")}</Th>
              <Th align="right">{t("invoices.detail.colRate")}</Th>
              <Th align="right">{t("invoices.detail.colCartons")}</Th>
              <Th align="right">{t("invoices.detail.colPackets")}</Th>
              <Th align="right">{t("invoices.detail.colAmount")}</Th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((li) => (
              <tr key={li.id} className="border-b border-row">
                <td className="px-3.5 py-3 text-[13.5px] font-semibold text-ink">
                  {li.item.name}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] text-text">
                  {kg(Number(li.grossWeightKg))}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] text-text">
                  {kg(Number(li.netWeightKg))}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] text-muted">
                  {pct(Number(li.glazingPct))}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] text-text">
                  {pkr(Number(li.ratePerKg))}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] text-text">
                  {li.cartonCount ?? "—"}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] text-text">
                  {li.packetCount ?? "—"}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] font-semibold text-ink">
                  {pkr(Number(li.amount))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-hair2 bg-card2">
              <td
                colSpan={7}
                className="px-3.5 py-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2"
              >
                {t("invoices.detail.total")}
              </td>
              <td className="px-3.5 py-3 text-right font-mono text-base font-semibold text-ink">
                {pkr(total)}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </Card>

      {invoice.notes && (
        <Card className="p-[18px] text-sm">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
            {t("invoices.detail.notes")}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-text">{invoice.notes}</p>
        </Card>
      )}

      {/* Package-delivered confirmation photo (optional, latest record). */}
      <PhotoSection
        invoiceId={invoice.id}
        photo={latestRecord?.optionalPhoto ?? null}
        canUpload={Boolean(latestRecord) && (isOffice || isDelivery)}
      />

      {/* Payments + balance-due panel (money stays office-side). */}
      {!isDelivery && (
      <div className="grid gap-3.5 lg:grid-cols-[1fr_300px]">
        <Card className="p-[18px]">
          <div className="mb-2.5 font-serif text-[17px] font-semibold text-ink">
            {t("invoices.detail.paymentsHeading")}
          </div>
          {invoice.payments.length === 0 ? (
            <div className="text-[13px] text-faint">{t("invoices.detail.paymentsNone")}</div>
          ) : (
            <div>
              {invoice.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 border-b border-row py-2.5 last:border-b-0"
                >
                  <span
                    className="h-[7px] w-[7px] flex-none rounded-full"
                    style={{ background: "var(--pos)" }}
                  />
                  <div className="flex-1 text-[13px] text-text">
                    <span className="capitalize">{p.type}</span>
                    {p.type === "cheque" && p.cheque
                      ? `${t("invoices.detail.chequePrefix")}${p.cheque.chequeNumber}`
                      : p.note
                        ? ` · ${p.note}`
                        : ""}
                    {p.isPartial && (
                      <Chip tone="warn" className="ml-2">
                        {t("invoices.detail.partial")}
                      </Chip>
                    )}
                  </div>
                  <div className="text-[12px] text-faint">{dateShort(p.date)}</div>
                  <div className="font-mono text-[13px] font-semibold text-pos">
                    {pkr(Number(p.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div
          className="self-start rounded-xl p-[18px]"
          style={{ background: "var(--side-bg)", color: "var(--side-fg)" }}
        >
          <div
            className="text-[10.5px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--side-dim)" }}
          >
            {t("invoices.detail.balanceDue")}
          </div>
          <div
            className="mt-2 font-mono text-[26px] font-semibold"
            style={{ color: balance > 0 ? "var(--neg)" : "var(--side-fg)" }}
          >
            {pkr(balance)}
          </div>
          <div
            className="mt-1 text-[11.5px]"
            style={{ color: "var(--side-dim)" }}
          >
            {t("invoices.detail.balanceOf")} {pkr(total)} · {paidPct}% {t("invoices.detail.balanceReceived")}
          </div>
          <div
            className="mt-2.5 h-1 overflow-hidden rounded-full"
            style={{ background: "rgba(242,235,217,.14)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${paidPct}%`, background: "var(--accent)" }}
            />
          </div>
          <Link
            href={`/parties/${invoice.partyId}`}
            className="mt-4 block rounded-lg py-2.5 text-center text-sm font-semibold text-on-accent"
            style={{ background: "var(--accent)" }}
          >
            {t("invoices.detail.recordPayment")}
          </Link>
        </div>
      </div>
      )}

      {/* Delivery-record version history — the dispute-defense trail. */}
      <Card className="overflow-hidden">
        <div className="flex items-baseline gap-1.5 px-[18px] pt-[18px]">
          <div className="font-serif text-[17px] font-semibold text-ink">
            {t("invoices.detail.historyHeading")}
          </div>
          <span className="text-[12px] text-faint">
            {t("invoices.detail.historyNote")}
          </span>
        </div>
        {invoice.deliveryRecords.length === 0 ? (
          <div className="px-[18px] pb-[18px] pt-2 text-[13px] text-faint">
            {t("invoices.detail.historyEmpty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr>
                <Th>{t("invoices.detail.colVersion")}</Th>
                <Th>{t("invoices.detail.colDeliveredAt")}</Th>
                <Th align="right">{t("invoices.detail.colHistoryTotal")}</Th>
              </tr>
            </thead>
            <tbody>
              {invoice.deliveryRecords.map((dr) => (
                <tr key={dr.id} className="border-b border-row">
                  <td className="px-3.5 py-3 text-[13px] text-text">
                    v{dr.version}
                    {dr.supersedesId === null && (
                      <Chip tone="neutral" className="ml-1.5">
                        {t("invoices.detail.original")}
                      </Chip>
                    )}
                  </td>
                  <td className="px-3.5 py-3 font-mono text-[13px] text-muted">
                    {new Date(dr.deliveredAt).toLocaleString("en-PK")}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-[13px] font-semibold text-ink">
                    {pkr(Number(dr.totalAmount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
