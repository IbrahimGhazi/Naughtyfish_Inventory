import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import BackLink from "../BackLink";
import { Card } from "../ui";
import { AddItemForm, ItemList, type ItemRow } from "./ItemControls";

export const dynamic = "force-dynamic";

export default async function ItemsSettingsPage() {
  const ctx = await getActiveContext();
  const items = await prisma.item.findMany({
    where: entityScope(ctx),
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const rows: ItemRow[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    cartonWeightKg: Number(i.cartonWeightKg),
    packetsPerCarton: i.packetsPerCarton,
    isPrawn: i.isPrawn,
    fixedRate: i.fixedRate != null ? Number(i.fixedRate) : null,
    defaultGlazingPct:
      i.defaultGlazingPct != null ? Number(i.defaultGlazingPct) : null,
    active: i.active,
  }));

  return (
    <div className="space-y-6">
      <BackLink />
      <div>
        <h1 className="text-xl font-semibold">Items / products</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Fish-fillet and prawn products. Fixed rates and default glazing % are{" "}
          <span className="font-medium">owner-confirmable</span> — leave them
          blank until confirmed. Items are deactivated, not deleted (they appear
          in invoice history).
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Existing items
        </h2>
        <ItemList items={rows} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Add item
        </h2>
        <AddItemForm />
      </Card>
    </div>
  );
}
