import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import BackLink from "../BackLink";
import { Card } from "../ui";
import { AddStoreForm, StoreList, type StoreRow } from "./StoreControls";

export const dynamic = "force-dynamic";

export default async function StoresSettingsPage() {
  const ctx = await getActiveContext();
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
    <div className="space-y-6">
      <BackLink />
      <div>
        <h1 className="text-xl font-semibold">Stores</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Stores can be renamed but not deleted — they are referenced by
          invoices, inventory and shipments.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Existing stores
        </h2>
        <StoreList stores={rows} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Add store
        </h2>
        <AddStoreForm />
      </Card>
    </div>
  );
}
