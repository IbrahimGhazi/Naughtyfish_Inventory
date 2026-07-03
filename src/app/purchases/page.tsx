import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getAppConfig, getCopy } from "@/lib/config";
import { pkr, dateShort } from "@/lib/format";
import { PageHeader, PrimaryButton, Chip } from "@/components/ui";

export const dynamic = "force-dynamic";

const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export default async function PurchasesPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "purchases");
  const cfg = await getAppConfig();
  if (!cfg.features.purchases) redirect("/");
  const t = await getCopy();

  const purchases = await prisma.purchase.findMany({
    where: entityScope(ctx),
    include: {
      supplier: { select: { name: true } },
      store: { select: { name: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { purchaseNumber: "desc" },
  });

  const rows = purchases.map((p) => {
    const total = Number(p.totalAmount);
    const paid = p.payments.reduce((s, pay) => s + Number(pay.amount), 0);
    const due = round2(Math.max(0, total - paid));
    return { ...p, total, due };
  });
  const openTotal = round2(rows.reduce((s, r) => s + r.due, 0));

  return (
    <div className="animate-rise space-y-5">
      <PageHeader
        eyebrow={t("purchases.list.eyebrow")}
        title={t("purchases.list.title")}
        subtitle={t("purchases.list.subtitle")}
        action={
          <PrimaryButton href="/purchases/new" data-testid="pur-new-link">
            {t("purchases.list.new")}
          </PrimaryButton>
        }
      />

      {rows.length === 0 ? (
        <p className="text-sm text-faint">
          {t("purchases.list.empty")}{" "}
          <Link href="/purchases/new" className="font-semibold text-accent-deep hover:underline">
            {t("purchases.list.emptyCta")}
          </Link>
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-hair bg-card">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>{t("purchases.list.colPurchase")}</Th>
                <Th>{t("purchases.list.colSupplier")}</Th>
                <Th>{t("purchases.list.colStore")}</Th>
                <Th>{t("purchases.list.colDate")}</Th>
                <Th align="right">{t("purchases.list.colDue")}</Th>
                <Th align="right">{t("purchases.list.colTotal")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-row transition-colors hover:bg-card2">
                  <td className="px-3.5 py-3">
                    <Link
                      href={`/purchases/${p.id}`}
                      data-testid={`pur-row-${p.id}`}
                      className="font-mono text-[13px] font-semibold text-gold hover:underline"
                    >
                      {p.reference}
                    </Link>
                    {p.supplierBillNo && (
                      <div className="mt-0.5 text-[11px] text-faint">
                        {t("purchases.list.billPrefix")} {p.supplierBillNo}
                      </div>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text">{p.supplier.name}</td>
                  <td className="px-3.5 py-3 text-[13px] text-muted">{p.store.name}</td>
                  <td className="px-3.5 py-3 text-[13px] text-muted">{dateShort(p.date)}</td>
                  <td className="px-3.5 py-3 text-right font-mono text-[13px]">
                    {p.due > 0 ? (
                      <span className="text-neg">{pkr(p.due)}</span>
                    ) : (
                      <Chip tone="pos">{t("purchases.detail.settled")}</Chip>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-[13px] font-semibold text-text">
                    {pkr(p.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between border-t border-hair2 bg-card2 px-3.5 py-2.5 text-[12px] text-muted">
            <span>
              {rows.length} {t("purchases.list.countSuffix")}
            </span>
            <span className="font-mono">
              {t("purchases.list.owedPrefix")} {pkr(openTotal)}
            </span>
          </div>
        </div>
      )}
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
