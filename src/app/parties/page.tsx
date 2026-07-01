import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

type PartyRow = {
  id: string;
  name: string;
  subType: string | null;
  channel: string | null;
};

/** Two-letter initials from a party name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function PartiesPage() {
  const ctx = await getActiveContext();
  const parties = await prisma.party.findMany({
    where: entityScope(ctx),
    orderBy: [{ partyType: "asc" }, { name: "asc" }],
  });

  const customers = parties.filter((p) => p.partyType === "customer");
  const suppliers = parties.filter((p) => p.partyType === "supplier");

  return (
    <div className="animate-rise space-y-5">
      <PageHeader
        eyebrow="Sales"
        title="Parties"
        subtitle="Customers and suppliers — click a party to open its ledger."
      />

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
        <Group title="Customers" tone="accent" parties={customers} emptyLabel="No customers yet." />
        <Group title="Suppliers" tone="gold" parties={suppliers} emptyLabel="No suppliers yet." />
      </div>
    </div>
  );
}

function Group({
  title,
  tone,
  parties,
  emptyLabel,
}: {
  title: string;
  tone: "accent" | "gold";
  parties: PartyRow[];
  emptyLabel: string;
}) {
  const avatar =
    tone === "accent"
      ? { background: "var(--accent-tint)", color: "var(--accent-deep)" }
      : { background: "var(--warn-bg)", color: "var(--gold)" };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-baseline justify-between border-b border-hair2 bg-card2 px-4 py-3.5">
        <span className="font-serif text-[16px] font-semibold text-ink">{title}</span>
      </div>
      {parties.length === 0 ? (
        <p className="px-4 py-6 text-sm text-faint">{emptyLabel}</p>
      ) : (
        <ul>
          {parties.map((p) => (
            <li key={p.id} className="border-b border-row last:border-b-0">
              <Link
                href={`/parties/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-card2"
              >
                <div
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-[12px] font-bold"
                  style={avatar}
                >
                  {initials(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-text">{p.name}</div>
                  <div className="text-[11.5px] text-muted">
                    {[p.subType, p.channel].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
