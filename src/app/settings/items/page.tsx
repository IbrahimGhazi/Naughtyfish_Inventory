import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getCopy } from "@/lib/config";
import BackLink from "../BackLink";
import { Card } from "../ui";
import { PageHeader } from "@/components/ui";
import { AddItemForm, ItemList, type ItemRow } from "./ItemControls";

export const dynamic = "force-dynamic";

export default async function ItemsSettingsPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "settings");
  const t = await getCopy();
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
    <div className="mx-auto max-w-[1000px] animate-rise px-8 pb-14 pt-7">
      <BackLink />
      <PageHeader
        eyebrow={t("settings.items.eyebrow")}
        title={t("settings.items.title")}
        subtitle={
          <>
            {t("settings.items.subtitle.prefix")}
            <span className="font-medium text-text">
              {t("settings.items.subtitle.ownerConfirmable")}
            </span>
            {t("settings.items.subtitle.suffix")}
          </>
        }
      />

      <div className="space-y-4">
        <Card>
          <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">
            {t("settings.items.existingHeading")}
          </h2>
          <ItemList items={rows} />
        </Card>

        <Card>
          <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">
            {t("settings.items.addHeading")}
          </h2>
          <AddItemForm />
        </Card>
      </div>
    </div>
  );
}
