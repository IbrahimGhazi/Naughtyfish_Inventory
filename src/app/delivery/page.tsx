import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { pkr, dateShort } from "@/lib/format";
import { getCopy } from "@/lib/config";
import { Card, StatusChip } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Delivery portal home — the ONLY landing surface for the delivery role
 * (roadmap M3.2): big touch targets for the three things this user does in the
 * field: enter an invoice, find their invoices to print, and attach the
 * delivered-package photo.
 */
export default async function DeliveryHome() {
  const ctx = await getActiveContext();
  requirePage(ctx, "delivery");
  const t = await getCopy();

  const recent = await prisma.invoice.findMany({
    where: { ...entityScope(ctx), createdById: ctx.user.id },
    include: {
      party: { select: { name: true } },
      deliveryRecords: {
        orderBy: { version: "desc" },
        take: 1,
        select: { optionalPhoto: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const first = ctx.user.name.split(" ")[0] || ctx.user.name;
  const pendingReview = recent.filter((i) => i.status === "draft").length;

  return (
    <div className="mx-auto max-w-[760px] animate-rise space-y-4">
      <div>
        <h1 className="font-serif text-[28px] font-semibold leading-tight text-ink">
          {t("delivery.home.greeting")} {first}
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          {t("delivery.home.subtitle")}
        </p>
      </div>

      {/* Big actions — thumb-sized for phone use in the field. */}
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Link
          href="/delivery/new"
          className="flex items-center gap-4 rounded-2xl p-5 transition-transform active:scale-[0.99]"
          style={{ background: "var(--accent)", color: "var(--on-accent)" }}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full text-2xl"
            style={{ background: "rgba(255,255,255,.16)" }}>
            +
          </span>
          <span>
            <span className="block font-serif text-[18px] font-semibold">{t("delivery.home.newInvoiceTitle")}</span>
            <span className="block text-[12px] opacity-80">{t("delivery.home.newInvoiceHint")}</span>
          </span>
        </Link>
        <Link
          href="/delivery/invoices"
          className="flex items-center gap-4 rounded-2xl border border-hair bg-card p-5 transition-transform active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: "var(--accent-tint)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M15 13H9M15 17H9" />
            </svg>
          </span>
          <span>
            <span className="block font-serif text-[18px] font-semibold text-ink">{t("delivery.home.myInvoicesTitle")}</span>
            <span className="block text-[12px] text-faint">{t("delivery.home.myInvoicesHint")}</span>
          </span>
        </Link>
      </div>

      {pendingReview > 0 && (
        <div className="rounded-xl border px-4 py-3 text-[13px]"
          style={{ borderColor: "var(--warn)", background: "var(--warn-bg)", color: "var(--warn)" }}>
          {pendingReview} of your recent invoice{pendingReview === 1 ? " is" : "s are"} {t("delivery.home.pendingReviewSuffix")}
        </div>
      )}

      {/* Recent own invoices. */}
      <Card className="p-[18px]">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-serif text-[17px] font-semibold text-ink">{t("delivery.home.recentHeading")}</div>
          <Link href="/delivery/invoices" className="p-1 text-[12px] font-semibold text-accent hover:text-accent-deep">
            {t("delivery.home.allMyInvoicesLink")}
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-[13px] text-faint">
            {t("delivery.home.emptyPrefix")} <strong>{t("delivery.home.emptyAction")}</strong> {t("delivery.home.emptySuffix")}
          </p>
        ) : (
          <div>
            {recent.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center gap-3 border-b border-row px-0.5 py-3 last:border-0 hover:bg-card2"
              >
                <span className="font-mono text-[12px] text-gold">#{inv.invoiceNumber}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-text">{inv.party.name}</div>
                  <div className="text-[11px] text-faint">{dateShort(inv.date)}</div>
                </div>
                {inv.deliveryRecords[0]?.optionalPhoto ? (
                  <span title={t("delivery.home.photoAttachedTitle")} className="text-[15px]">📷</span>
                ) : null}
                <StatusChip status={inv.status} label={inv.status === "draft" ? t("delivery.home.awaitingReviewChip") : undefined} />
                <div className="w-24 text-right font-mono text-[13px] font-semibold text-text">
                  {pkr(Number(inv.totalAmount))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
