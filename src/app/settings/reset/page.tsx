import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage, ADMIN_ROLES } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getCopy } from "@/lib/config";
import { PageHeader, Card, BackLink } from "@/components/ui";
import ResetForm from "./ResetForm";

export const dynamic = "force-dynamic";

/**
 * Danger zone — irreversibly wipe every business record in the active book.
 * Admin-only; non-admins are bounced back to the settings hub.
 */
export default async function ResetPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "settings");
  if (!ADMIN_ROLES.includes(ctx.user.role)) redirect("/settings");
  const t = await getCopy();
  const scope = entityScope(ctx);

  const [parties, items, stores, invoices, purchases, deliveries, shipments] =
    await Promise.all([
      prisma.party.count({ where: scope }),
      prisma.item.count({ where: scope }),
      prisma.store.count({ where: scope }),
      prisma.invoice.count({ where: scope }),
      prisma.purchase.count({ where: scope }),
      prisma.deliveryRecord.count({ where: scope }),
      prisma.shipment.count({ where: scope }),
    ]);

  const counts: { label: string; n: number }[] = [
    { label: t("settings.reset.count.parties"), n: parties },
    { label: t("settings.reset.count.items"), n: items },
    { label: t("settings.reset.count.stores"), n: stores },
    { label: t("settings.reset.count.invoices"), n: invoices },
    { label: t("settings.reset.count.purchases"), n: purchases },
    { label: t("settings.reset.count.deliveries"), n: deliveries },
    { label: t("settings.reset.count.shipments"), n: shipments },
  ];

  return (
    <div className="mx-auto max-w-lg animate-rise">
      <BackLink href="/settings">{t("settings.backLink")}</BackLink>
      <PageHeader
        eyebrow={t("settings.reset.eyebrow")}
        title={t("settings.reset.title")}
        subtitle={
          <>
            {t("settings.reset.subtitle.prefix")}
            <span className="font-medium text-text">{ctx.entityName}</span>
            {t("settings.reset.subtitle.suffix")}
          </>
        }
      />

      <Card
        className="mb-4 p-[18px]"
        style={{ borderColor: "var(--neg, #c0392b)" }}
      >
        <h2 className="text-sm font-semibold text-neg">
          {t("settings.reset.warnTitle")}
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          {t("settings.reset.warnBody")}
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
          {counts.map((c) => (
            <li key={c.label} className="flex justify-between text-muted">
              <span>{c.label}</span>
              <span className="font-mono text-text">{c.n}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] leading-relaxed text-faint">
          {t("settings.reset.keepNote")}
        </p>
      </Card>

      <Card className="p-[18px]">
        <ResetForm entityName={ctx.entityName} />
      </Card>
    </div>
  );
}
