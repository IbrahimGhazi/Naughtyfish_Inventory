import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { OFFICE_ROLES } from "@/lib/roles";
import { getAppConfig } from "@/lib/config";
import type { Bootstrap } from "@/lib/offline/types";

// Reference data the field surface needs cached so it works with no signal.
export const dynamic = "force-dynamic";

const INVOICE_ROLES = new Set<string>([...OFFICE_ROLES, "north_employee", "delivery"]);
const PAY_ROLES = new Set<string>([...OFFICE_ROLES]); // payments are office-only

export async function GET() {
  const ctx = await getActiveContext();
  const scope = entityScope(ctx);
  const cfg = await getAppConfig();

  const [parties, items, stores, series] = await Promise.all([
    prisma.party.findMany({
      where: scope,
      select: {
        id: true,
        name: true,
        partyType: true,
        subType: true,
        channel: true,
        ntn: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.item.findMany({
      where: { ...scope, active: true },
      select: { id: true, name: true, isPrawn: true },
      orderBy: { name: "asc" },
    }),
    prisma.store.findMany({
      where: scope,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.referenceSeries.findMany({ where: scope, select: { bookRegion: true } }),
  ]);

  const body: Bootstrap = {
    serverTime: new Date().toISOString(),
    entityId: ctx.entityId,
    entityName: ctx.entityName,
    appName: cfg.branding.appName,
    userId: ctx.user.id,
    userRole: ctx.user.role,
    canInvoice: INVOICE_ROLES.has(ctx.user.role),
    canPay: PAY_ROLES.has(ctx.user.role),
    parties,
    items,
    stores,
    referenceRegions: [...new Set(series.map((s) => s.bookRegion))],
  };

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
