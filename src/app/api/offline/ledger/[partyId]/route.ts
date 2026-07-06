import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { canView } from "@/lib/roles";
import { buildPartyLedger } from "@/lib/ledger";
import type { CachedLedger } from "@/lib/offline/types";

// A single party's ledger snapshot, cached so it's readable offline.
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ partyId: string }> },
) {
  const { partyId } = await params;
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);

  const party = await prisma.party.findFirst({
    where: { id: partyId, ...scope },
    select: { id: true, name: true },
  });
  if (!party) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Mirror the party-ledger page: purchase rows only for roles with that grant.
  const ledger = await buildPartyLedger(ctx.entityId, partyId, undefined, {
    includePurchases: canView(ctx, "purchases"),
  });

  const body: CachedLedger = {
    partyId,
    partyName: party.name,
    syncedAt: new Date().toISOString(),
    opening: ledger.opening,
    netOutstanding: ledger.netOutstanding,
    rows: ledger.rows.map((r) => ({
      date: r.date.toISOString(),
      kind: r.kind,
      ref: r.ref,
      debit: r.debit,
      credit: r.credit,
      balance: r.balance,
      meta: r.meta,
    })),
  };

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
