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
} from "./InvoiceForm";
import { PageHeader, BackLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "invoices");
  const scope = entityScope(ctx);
  const cfg = await getAppConfig();
  const copy = await getCopy();

  const [parties, items, stores, glazing] = await Promise.all([
    prisma.party.findMany({ where: { ...scope, partyType: "customer" }, orderBy: { name: "asc" } }),
    prisma.item.findMany({ where: { ...scope, active: true }, orderBy: { name: "asc" } }),
    prisma.store.findMany({ where: storeScope(ctx), orderBy: { name: "asc" } }),
    prisma.glazingSetting.findMany({ where: scope }),
  ]);

  // Item-level expected glazing baseline for the live variance hint.
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
    expectedGlazingPct: expectedByItem.get(i.id) ?? (i.defaultGlazingPct === null ? null : Number(i.defaultGlazingPct)),
  }));
  const formParties: FormParty[] = parties.map((p) => ({
    id: p.id,
    name: p.name,
    channel: p.channel,
    subType: p.subType,
  }));
  const formStores: FormStore[] = stores.map((s) => ({ id: s.id, name: s.name }));

  const t = cfg.terminology;
  const labels: FormLabels = {
    packagePlural: t.packagePlural,
    subUnitPlural: t.subUnitPlural,
    weightUnit: t.weightUnit,
    glazingLabel: t.glazingLabel,
    channelNorth: t.channelNorthLabel,
    channelLocal: t.channelLocalLabel,
  };

  return (
    <div className="animate-rise space-y-4">
      <div>
        <BackLink href="/invoices">{copy("invoices.new.backAll")}</BackLink>
        <PageHeader
          eyebrow={copy("invoices.new.eyebrow")}
          title={copy("invoices.new.title")}
          subtitle={
            cfg.features.glazing ? (
              <>
                {t.channelNorthLabel} {copy("invoices.new.subtitleBills")}{" "}
                <strong>{copy("invoices.new.subtitleNet")}</strong>{" "}
                {copy("invoices.new.subtitleWeightAfter")}{" "}
                {t.glazingLabel.toLowerCase()}{copy("invoices.new.subtitleEnterGross")}{" "}
                {t.channelLocalLabel} {copy("invoices.new.subtitleHasNo")}{" "}
                {t.glazingLabel.toLowerCase()}{copy("invoices.new.subtitleEngine")}
              </>
            ) : (
              <>{copy("invoices.new.subtitleSimple")}</>
            )
          }
        />
      </div>
      <InvoiceForm
        parties={formParties}
        items={formItems}
        stores={formStores}
        labels={labels}
        showGlazing={cfg.features.glazing}
        showPackaging={cfg.features.packaging}
      />
    </div>
  );
}
