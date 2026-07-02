import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { requirePage } from "@/lib/roles";
import { entityScope } from "@/lib/scope";
import BackLink from "../BackLink";
import { Card } from "../ui";
import { PageHeader } from "@/components/ui";
import { AddPartyForm, PartyList, type PartyRow } from "./PartyControls";

export const dynamic = "force-dynamic";

export default async function PartiesSettingsPage() {
  const ctx = await getActiveContext();
  requirePage(ctx, "settings");
  const parties = await prisma.party.findMany({
    where: entityScope(ctx),
    orderBy: [{ partyType: "asc" }, { name: "asc" }],
  });

  const rows: PartyRow[] = parties.map((p) => ({
    id: p.id,
    name: p.name,
    partyType: p.partyType,
    subType: p.subType,
    channel: p.channel,
    address: p.address,
    ntn: p.ntn,
    openingBalance: Number(p.openingBalance),
  }));

  const customers = rows.filter((p) => p.partyType === "customer");
  const suppliers = rows.filter((p) => p.partyType === "supplier");

  return (
    <div className="mx-auto max-w-[1000px] animate-rise px-8 pb-14 pt-7">
      <BackLink />
      <PageHeader
        eyebrow="Admin"
        title="Parties & suppliers"
        subtitle="Add and edit customers and suppliers. Local buyers can be name-only (leave NTN blank); opening balances feed the ledgers."
      />

      <div className="space-y-4">
        <Card className="space-y-5">
          <PartyList title="Customers" parties={customers} />
          <PartyList title="Suppliers" parties={suppliers} />
        </Card>

        <Card>
          <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">
            Add party / supplier
          </h2>
          <AddPartyForm />
        </Card>
      </div>
    </div>
  );
}
