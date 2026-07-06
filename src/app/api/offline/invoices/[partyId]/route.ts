import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import type { CachedInvoice, CachedPartyInvoices } from "@/lib/offline/types";

// A party's recent invoices (with line detail) cached for offline viewing in
// Field mode. Capped to the most recent 50 to bound the payload.
export const dynamic = "force-dynamic";

const MAX_INVOICES = 50;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ partyId: string }> },
) {
  const { partyId } = await params;
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);

  const party = await prisma.party.findFirst({
    where: { id: partyId, ...scope },
    select: { id: true, partyType: true, ntn: true },
  });
  if (!party) return NextResponse.json({ error: "not found" }, { status: 404 });

  const invoices = await prisma.invoice.findMany({
    where: { partyId, ...scope },
    include: {
      lineItems: { include: { item: { select: { name: true } } } },
      payments: { select: { amount: true } },
    },
    orderBy: { invoiceNumber: "desc" },
    take: MAX_INVOICES,
  });

  const partyMeta = [party.partyType, party.ntn ? `NTN ${party.ntn}` : null]
    .filter(Boolean)
    .join(" · ");

  const mapped: CachedInvoice[] = invoices.map((inv) => {
    const total = Number(inv.totalAmount);
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      referenceNumber: inv.referenceNumber,
      channel: inv.channel,
      status: inv.status,
      dateISO: inv.date.toISOString(),
      partyMeta,
      total,
      paid,
      balance: total - paid,
      notes: inv.notes,
      lines: inv.lineItems.map((li) => ({
        itemName: li.item.name,
        grossKg: Number(li.grossWeightKg),
        netKg: Number(li.netWeightKg),
        glazingPct: Number(li.glazingPct),
        ratePerKg: Number(li.ratePerKg),
        cartonCount: li.cartonCount,
        packetCount: li.packetCount,
        amount: Number(li.amount),
      })),
    };
  });

  const body: CachedPartyInvoices = {
    partyId,
    syncedAt: new Date().toISOString(),
    invoices: mapped,
  };

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
