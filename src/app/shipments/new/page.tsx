import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { getAppConfig, getCopy } from "@/lib/config";
import { requirePage } from "@/lib/roles";
import { entityScope, storeScope } from "@/lib/scope";
import { CITY_NAMES } from "@/lib/geo";
import { BackLink, PageHeader } from "@/components/ui";
import ShipmentForm, {
  type FormStore,
  type FormParty,
  type FormInvoice,
} from "./ShipmentForm";

export const dynamic = "force-dynamic";

export default async function NewShipmentPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "shipments");
  const cfg = await getAppConfig();
  if (!cfg.features.shipments) redirect("/");
  const t = await getCopy();
  const scope = entityScope(ctx);

  const [stores, parties, invoices] = await Promise.all([
    prisma.store.findMany({ where: storeScope(ctx), orderBy: { name: "asc" } }),
    prisma.party.findMany({
      where: { ...scope, partyType: "customer" },
      orderBy: { name: "asc" },
    }),
    prisma.invoice.findMany({
      where: scope,
      include: { party: true },
      orderBy: { invoiceNumber: "desc" },
      take: 40,
    }),
  ]);

  const formStores: FormStore[] = stores.map((s) => ({
    id: s.id,
    name: s.name,
    city: s.city ?? null,
  }));
  const formParties: FormParty[] = parties.map((p) => ({ id: p.id, name: p.name }));
  const formInvoices: FormInvoice[] = invoices.map((i) => ({
    id: i.id,
    invoiceNumber: i.invoiceNumber,
    partyId: i.partyId,
    partyName: i.party.name,
  }));

  return (
    <div className="animate-rise space-y-5">
      <div>
        <BackLink href="/shipments">{t("shipments.new.backLink")}</BackLink>
        <PageHeader
          eyebrow={t("shipments.new.eyebrow")}
          title={t("shipments.new.title")}
          subtitle={t("shipments.new.subtitle")}
        />
      </div>
      <ShipmentForm
        defaultOriginCity={cfg.map.originCity}
        cities={CITY_NAMES}
        stores={formStores}
        parties={formParties}
        invoices={formInvoices}
      />
    </div>
  );
}
