import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getAppConfig, getCopy } from "@/lib/config";
import { pkr, kg, dateShort } from "@/lib/format";
import { BackLink, Card, Chip } from "@/components/ui";

export const dynamic = "force-dynamic";

const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveContext();
  requirePage(ctx, "purchases");
  const cfg = await getAppConfig();
  if (!cfg.features.purchases) redirect("/");
  const t = await getCopy();

  const purchase = await prisma.purchase.findFirst({
    where: { id, ...entityScope(ctx) },
    include: {
      supplier: { select: { id: true, name: true } },
      store: { select: { name: true } },
      enteredBy: { select: { name: true } },
      lineItems: { include: { item: { select: { name: true } } } },
      payments: { include: { cheque: { select: { chequeNumber: true } } }, orderBy: { date: "asc" } },
    },
  });
  if (!purchase) notFound();

  const total = Number(purchase.totalAmount);
  const paid = purchase.payments.reduce((s, p) => s + Number(p.amount), 0);
  const due = round2(Math.max(0, total - paid));
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  return (
    <div className="animate-rise mx-auto max-w-[1000px] space-y-4">
      <div>
        <BackLink href="/purchases">{t("purchases.detail.back")}</BackLink>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              {t("purchases.detail.eyebrow")}
            </div>
            <h1 className="font-serif text-[28px] font-semibold leading-tight text-ink">
              <span className="font-mono text-gold">{purchase.reference}</span>
            </h1>
            <div className="mt-1 text-[13px] text-muted">
              <Link
                href={`/parties/${purchase.supplier.id}`}
                className="underline decoration-hair underline-offset-4 hover:text-accent-deep"
              >
                {purchase.supplier.name}
              </Link>{" "}
              · {dateShort(purchase.date)}
            </div>
          </div>
          <Chip tone={due > 0 ? "warn" : "pos"}>
            {due > 0 ? t("purchases.detail.open") : t("purchases.detail.settled")}
          </Chip>
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Meta label={t("purchases.detail.supplierBill")}>{purchase.supplierBillNo ?? "—"}</Meta>
        <Meta label={t("purchases.detail.store")}>{purchase.store.name}</Meta>
        <Meta label={t("purchases.detail.date")}>{dateShort(purchase.date)}</Meta>
        <Meta label={t("purchases.detail.enteredBy")}>{purchase.enteredBy?.name ?? "—"}</Meta>
      </div>

      {/* Lines */}
      <div className="overflow-hidden rounded-xl border border-hair bg-card">
        <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>{t("purchases.detail.colItem")}</Th>
              <Th align="right">{t("purchases.detail.colWeight")}</Th>
              <Th align="right">{t("purchases.detail.colRate")}</Th>
              <Th align="right">{t("purchases.detail.colCartons")}</Th>
              <Th align="right">{t("purchases.detail.colPackets")}</Th>
              <Th align="right">{t("purchases.detail.colAmount")}</Th>
            </tr>
          </thead>
          <tbody>
            {purchase.lineItems.map((l) => (
              <tr key={l.id} className="border-b border-row">
                <td className="px-3.5 py-3 text-[13.5px] font-semibold text-text">{l.item.name}</td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] text-text">
                  {kg(Number(l.weightKg))}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] text-text">
                  {pkr(Number(l.ratePerKg))}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] text-muted">
                  {l.cartons ?? "—"}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] text-muted">
                  {l.packets ?? "—"}
                </td>
                <td className="px-3.5 py-3 text-right font-mono text-[13px] font-semibold text-text">
                  {pkr(Number(l.amount))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={5}
                className="bg-card2 px-3.5 py-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint2"
              >
                {t("purchases.detail.totalLabel")}
              </td>
              <td className="bg-card2 px-3.5 py-3 text-right font-mono text-[15px] font-semibold text-ink">
                {pkr(total)}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Payments */}
        <Card className="p-[18px]">
          <div className="mb-2 font-serif text-[17px] font-semibold text-ink">
            {t("purchases.detail.payments")}
          </div>
          {purchase.payments.length === 0 ? (
            <p className="text-[13px] text-faint">{t("purchases.detail.noPayments")}</p>
          ) : (
            <div>
              {purchase.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 border-b border-row py-2.5 last:border-0"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pos" />
                  <div className="flex-1 text-[13px] capitalize text-text">
                    {p.type}
                    {p.cheque ? ` · ${p.cheque.chequeNumber}` : ""}
                    {p.note && <span className="ml-1 normal-case text-muted">· {p.note}</span>}
                  </div>
                  <span className="text-[12px] text-faint">{dateShort(p.date)}</span>
                  <span className="font-mono text-[13px] font-semibold text-pos">
                    {pkr(Number(p.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
          {purchase.notes && (
            <div className="mt-3 border-t border-row pt-3">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint2">
                {t("purchases.detail.notes")}
              </div>
              <p className="mt-1 text-[13px] text-muted">{purchase.notes}</p>
            </div>
          )}
        </Card>

        {/* Balance card (dark ink) */}
        <div
          className="rounded-2xl p-[18px]"
          style={{ background: "var(--side-bg)", color: "var(--side-fg)" }}
        >
          <div
            className="text-[10.5px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--side-dim)" }}
          >
            {t("purchases.detail.balanceDue")}
          </div>
          <div className="mt-1.5 font-mono text-[26px] font-semibold" style={{ color: due > 0 ? "#e5a492" : "#9ccdb4" }}>
            {pkr(due)}
          </div>
          <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--side-dim)" }}>
            {t("purchases.detail.ofTotalPrefix")} {pkr(total)} · {paidPct}
            {t("purchases.detail.paidSuffix")}
          </div>
          <div
            className="mt-2.5 h-1 overflow-hidden rounded-full"
            style={{ background: "rgba(242,235,217,.16)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${paidPct}%`, background: "var(--accent)" }}
            />
          </div>
          {due > 0 && (
            <Link
              href={`/parties/${purchase.supplier.id}/payment?purchase=${purchase.id}`}
              data-testid="pur-pay-link"
              className="mt-4 block rounded-lg py-2.5 text-center text-sm font-semibold text-on-accent"
              style={{ background: "var(--accent)" }}
            >
              {t("purchases.detail.payButton")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-hair bg-card px-3.5 py-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint2">{label}</div>
      <div className="mt-1 text-[13.5px] font-semibold text-text">{children}</div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`border-b border-hair2 bg-card2 px-3.5 py-2.5 ${align === "right" ? "text-right" : "text-left"} text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint2`}
    >
      {children}
    </th>
  );
}
