import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function PartiesPage() {
  const ctx = await getActiveContext();
  const parties = await prisma.party.findMany({
    where: entityScope(ctx),
    orderBy: [{ partyType: "asc" }, { name: "asc" }],
  });

  const customers = parties.filter((p) => p.partyType === "customer");
  const suppliers = parties.filter((p) => p.partyType === "supplier");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Parties &amp; Ledgers</h1>
      <Group title="Customers" parties={customers} />
      <Group title="Suppliers" parties={suppliers} />
    </div>
  );
}

function Group({
  title,
  parties,
}: {
  title: string;
  parties: { id: string; name: string; subType: string | null; channel: string | null }[];
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</h2>
      {parties.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">None.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {parties.map((p) => (
            <li key={p.id}>
              <Link href={`/parties/${p.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                <span>{p.name}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {[p.subType, p.channel].filter(Boolean).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
