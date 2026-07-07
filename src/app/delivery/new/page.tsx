import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope, storeScope } from "@/lib/scope";
import { getAppConfig, getCopy } from "@/lib/config";
import InvoiceForm, {
  type FormItem,
  type FormLabels,
  type FormParty,
  type FormStore,
  type FormNote,
} from "@/app/invoices/new/InvoiceForm";
import { PageHeader, BackLink } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * Delivery-portal invoice entry. The SAME shared form + billing engine as the
 * office screen — but submissions land as DRAFTS the office reviews (enforced
 * server-side in createInvoice, not just here).
 */
export default async function DeliveryNewInvoicePage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "delivery");
  const scope = entityScope(ctx);
  const cfg = await getAppConfig();
  const t = await getCopy();

  const [parties, items, stores, glazing, notes] = await Promise.all([
    prisma.party.findMany({ where: { ...scope, partyType: "customer" }, orderBy: { name: "asc" } }),
    prisma.item.findMany({ where: { ...scope, active: true }, orderBy: { name: "asc" } }),
    prisma.store.findMany({ where: storeScope(ctx), orderBy: { name: "asc" } }),
    prisma.glazingSetting.findMany({ where: scope }),
    prisma.invoiceNote.findMany({
      where: scope,
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
      select: { id: true, text: true, isDefault: true },
    }),
  ]);

  const expectedByItem = new Map<string, number>();
  for (const g of glazing) {
    if (g.partyId === null && !expectedByItem.has(g.itemId)) {
      expectedByItem.set(g.itemId, Number(g.expectedGlazingPct));
    }
  }

  const formItems: FormItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    isPrawn: i.isPrawn,
    fixedRate: i.fixedRate === null ? null : Number(i.fixedRate),
    packetsPerCarton: i.packetsPerCarton,
    expectedGlazingPct:
      expectedByItem.get(i.id) ?? (i.defaultGlazingPct === null ? null : Number(i.defaultGlazingPct)),
  }));
  const formParties: FormParty[] = parties.map((p) => ({
    id: p.id,
    name: p.name,
    channel: p.channel,
    subType: p.subType,
  }));
  const formStores: FormStore[] = stores.map((s) => ({ id: s.id, name: s.name }));
  const formNotes: FormNote[] = notes;

  const labels: FormLabels = {
    packagePlural: cfg.terminology.packagePlural,
    subUnitPlural: cfg.terminology.subUnitPlural,
    weightUnit: cfg.terminology.weightUnit,
    glazingLabel: cfg.terminology.glazingLabel,
    channelNorth: cfg.terminology.channelNorthLabel,
    channelLocal: cfg.terminology.channelLocalLabel,
  };

  return (
    <div className="animate-rise space-y-4">
      <div>
        <BackLink href="/delivery">{t("delivery.new.back")}</BackLink>
        <PageHeader
          eyebrow={t("delivery.new.eyebrow")}
          title={t("delivery.new.title")}
          subtitle={t("delivery.new.subtitle")}
        />
      </div>
      <InvoiceForm
        parties={formParties}
        items={formItems}
        stores={formStores}
        savedNotes={formNotes}
        labels={labels}
        showGlazing={cfg.features.glazing}
        showPackaging={cfg.features.packaging}
        deliveryMode
      />
    </div>
  );
}
