import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getAppConfig, getCopy } from "@/lib/config";
import { BackLink } from "@/components/ui";
import PurchaseForm, { type FormSupplier, type FormStore, type FormItem } from "./PurchaseForm";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "purchases");
  const cfg = await getAppConfig();
  if (!cfg.features.purchases) redirect("/");
  const t = await getCopy();
  const scope = entityScope(ctx);

  const [suppliers, stores, items, last] = await Promise.all([
    prisma.party.findMany({
      where: { ...scope, partyType: "supplier" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.store.findMany({ where: scope, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.item.findMany({
      where: { ...scope, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nature: true, fixedRate: true },
    }),
    prisma.purchase.findFirst({
      where: scope,
      orderBy: { purchaseNumber: "desc" },
      select: { purchaseNumber: true },
    }),
  ]);

  const formSuppliers: FormSupplier[] = suppliers;
  const formStores: FormStore[] = stores;
  const formItems: FormItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    nature: i.nature,
    rate: i.fixedRate == null ? null : Number(i.fixedRate),
  }));
  const nextReference = `PUR-${String((last?.purchaseNumber ?? 0) + 1).padStart(6, "0")}`;

  return (
    <div className="animate-rise space-y-5">
      <div>
        <BackLink href="/purchases">{t("purchases.new.back")}</BackLink>
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          {t("purchases.new.eyebrow")}
        </div>
        <h1 className="font-serif text-[28px] font-semibold leading-tight text-ink">
          {t("purchases.new.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("purchases.new.subtitle")}</p>
      </div>

      <PurchaseForm
        suppliers={formSuppliers}
        stores={formStores}
        items={formItems}
        nextReference={nextReference}
      />
    </div>
  );
}
