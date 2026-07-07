import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import { getCopy } from "@/lib/config";
import { PageHeader } from "@/components/ui";
import { PartyGroupList, type PartyRow } from "../PartyGroupList";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "parties");
  const t = await getCopy();
  const suppliers: PartyRow[] = await prisma.party.findMany({
    where: { ...entityScope(ctx), partyType: "supplier" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, subType: true, channel: true },
  });

  return (
    <div className="animate-rise space-y-5">
      <PageHeader
        eyebrow={t("parties.list.eyebrow")}
        title={t("parties.list.suppliers")}
        subtitle={t("parties.list.suppliersSubtitle")}
      />
      <PartyGroupList tone="gold" parties={suppliers} emptyLabel={t("parties.list.noSuppliers")} />
    </div>
  );
}
