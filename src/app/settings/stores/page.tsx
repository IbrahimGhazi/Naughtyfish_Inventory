import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import BackLink from "../BackLink";
import { Card } from "../ui";
import { PageHeader } from "@/components/ui";
import { AddStoreForm, StoreList, type StoreRow } from "./StoreControls";

export const dynamic = "force-dynamic";

export default async function StoresSettingsPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "settings");
  const stores = await prisma.store.findMany({
    where: entityScope(ctx),
    orderBy: { name: "asc" },
  });

  const rows: StoreRow[] = stores.map((s) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    region: s.region,
    ownershipType: s.ownershipType,
  }));

  return (
    <div className="mx-auto max-w-[1000px] animate-rise px-8 pb-14 pt-7">
      <BackLink />
      <PageHeader
        eyebrow="Admin"
        title="Stores"
        subtitle="Stores can be renamed but not deleted — they are referenced by invoices, inventory and shipments."
      />

      <div className="space-y-4">
        <Card>
          <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">
            Existing stores
          </h2>
          <StoreList stores={rows} />
        </Card>

        <Card>
          <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">
            Add store
          </h2>
          <AddStoreForm />
        </Card>
      </div>
    </div>
  );
}
