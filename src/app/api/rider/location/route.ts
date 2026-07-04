import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { OFFICE_ROLES } from "@/lib/roles";

// Rider posts a GPS fix here; it updates the location of every ACTIVE shipment
// assigned to them (normally one). Foreground-only — the rider's phone only
// sends while the app is open.
export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["preparing", "in_transit", "delayed"];
const ALLOWED_ROLES = new Set<string>([...OFFICE_ROLES, "delivery"]);

export async function POST(req: Request) {
  const ctx = await getActiveContext();
  if (!ALLOWED_ROLES.has(ctx.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const b = body as { lat?: unknown; lng?: unknown; accuracy?: unknown };
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  const accuracy = b.accuracy == null ? null : Number(b.accuracy);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 });
  }

  const res = await prisma.shipment.updateMany({
    where: {
      ...entityScope(ctx),
      assignedRiderId: ctx.user.id,
      status: { in: ACTIVE_STATUSES },
    },
    data: {
      currentLat: lat,
      currentLng: lng,
      locationAccuracyM: accuracy != null && Number.isFinite(accuracy) ? accuracy : null,
      locationUpdatedAt: new Date(),
    },
  });

  return NextResponse.json({ updated: res.count }, { headers: { "Cache-Control": "no-store" } });
}
