import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope, storeScope } from "@/lib/scope";
import { getAppConfig } from "@/lib/config";
import InvoiceForm, {
  type FormItem,
  type FormLabels,
  type FormParty,
  type FormStore,
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

  const [parties, items, stores, series, glazing] = await Promise.all([
    prisma.party.findMany({ where: { ...scope, partyType: "customer" }, orderBy: { name: "asc" } }),
    prisma.item.findMany({ where: { ...scope, active: true }, orderBy: { name: "asc" } }),
    prisma.store.findMany({ where: storeScope(ctx), orderBy: { name: "asc" } }),
    prisma.referenceSeries.findMany({ where: scope, orderBy: { bookRegion: "asc" } }),
    prisma.glazingSetting.findMany({ where: scope }),
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
  const regions = series.map((s) => s.bookRegion);

  const labels: FormLabels = {
    packagePlural: cfg.terminology.packagePlural,
    subUnitPlural: cfg.terminology.subUnitPlural,
    weightUnit: cfg.terminology.weightUnit,
    glazingLabel: cfg.terminology.glazingLabel,
    channelNorth: cfg.terminology.channelNorthLabel,
    channelLocal: cfg.terminology.channelLocalLabel,
  };

  return (
    <div className="animate-rise space-y-4 px-6 pb-14 pt-7">
      <div>
        <BackLink href="/delivery">← Delivery home</BackLink>
        <PageHeader
          eyebrow="Delivery"
          title="New invoice"
          subtitle="Fill it exactly like the paper slip. It goes to the office as a draft for approval — you can print it and attach the package photo right away."
        />
      </div>
      <InvoiceForm
        parties={formParties}
        items={formItems}
        stores={formStores}
        regions={regions}
        labels={labels}
        showGlazing={cfg.features.glazing}
        showPackaging={cfg.features.packaging}
        deliveryMode
      />
    </div>
  );
}
