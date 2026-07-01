import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import BackLink from "../BackLink";
import { Card } from "../ui";
import { AddPartyForm, PartyList, type PartyRow } from "./PartyControls";

export const dynamic = "force-dynamic";

export default async function PartiesSettingsPage() {
  const ctx = await getActiveContext();
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
    <div className="space-y-6">
      <BackLink />
      <div>
        <h1 className="text-xl font-semibold">Parties &amp; suppliers</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Add and edit customers and suppliers. Local buyers can be name-only
          (leave NTN blank); opening balances feed the ledgers.
        </p>
      </div>

      <Card className="space-y-5">
        <PartyList title="Customers" parties={customers} />
        <PartyList title="Suppliers" parties={suppliers} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Add party / supplier
        </h2>
        <AddPartyForm />
      </Card>
    </div>
  );
}
