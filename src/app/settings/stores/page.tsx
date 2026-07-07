import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getCopy } from "@/lib/config";
import BackLink from "../BackLink";
import { Card } from "../ui";
import { PageHeader } from "@/components/ui";
import { AddStoreForm, StoreList, type StoreRow } from "./StoreControls";
import { parseTypes } from "@/lib/processes";

export const dynamic = "force-dynamic";

export default async function StoresSettingsPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "settings");
  const t = await getCopy();
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
    processCapabilities: parseTypes(s.processCapabilities),
  }));

  return (
    <div className="mx-auto max-w-[1000px] animate-rise">
      <BackLink />
      <PageHeader
        eyebrow={t("settings.stores.eyebrow")}
        title={t("settings.stores.title")}
        subtitle={t("settings.stores.subtitle")}
      />

      <div className="space-y-4">
        <Card>
          <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">
            {t("settings.stores.existingHeading")}
          </h2>
          <StoreList stores={rows} />
        </Card>

        <Card>
          <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">
            {t("settings.stores.addHeading")}
          </h2>
          <AddStoreForm />
        </Card>
      </div>
    </div>
  );
}
