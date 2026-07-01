import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope, storeScope } from "@/lib/scope";
import { CITY_NAMES } from "@/lib/geo";
import ShipmentForm, {
  type FormStore,
  type FormParty,
  type FormInvoice,
} from "./ShipmentForm";

export const dynamic = "force-dynamic";

export default async function NewShipmentPage() {
  const ctx = await getActiveContext();
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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New shipment</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Track a parcel from an origin to a destination city. Cities feed the
        dashboard map; departure and ETA drive the “in&nbsp;2&nbsp;days / overdue” hints.
      </p>
      <ShipmentForm
        cities={CITY_NAMES}
        stores={formStores}
        parties={formParties}
        invoices={formInvoices}
      />
    </div>
  );
}
