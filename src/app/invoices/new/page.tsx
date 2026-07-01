import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope, storeScope } from "@/lib/scope";
import InvoiceForm, { type FormItem, type FormParty, type FormStore } from "./InvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);

  const [parties, items, stores, series, glazing] = await Promise.all([
    prisma.party.findMany({ where: { ...scope, partyType: "customer" }, orderBy: { name: "asc" } }),
    prisma.item.findMany({ where: { ...scope, active: true }, orderBy: { name: "asc" } }),
    prisma.store.findMany({ where: storeScope(ctx), orderBy: { name: "asc" } }),
    prisma.referenceSeries.findMany({ where: scope, orderBy: { bookRegion: "asc" } }),
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
  const regions = series.map((s) => s.bookRegion);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Invoice / Delivery</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        North (frozen) bills on <strong>net</strong> weight after glazing; enter gross + the
        buyer&apos;s final weight and the % is derived. Local (Karachi, fresh) has no glazing.
        Every amount is recomputed on the server through the shared billing engine.
      </p>
      <InvoiceForm
        parties={formParties}
        items={formItems}
        stores={formStores}
        regions={regions}
      />
    </div>
  );
}
