import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { dateShort } from "@/lib/format";
import { PageHeader, PrimaryButton } from "@/components/ui";
import { STATUS_LABELS, statusSortWeight, etaHint, isShipmentStatus } from "@/lib/shipments";
import { cityByName, project } from "@/lib/geo";
import { KARACHI_XY, progressFor } from "@/lib/mapgeo";
import ShipmentTracker, { type TrackedShipment } from "@/components/ShipmentTracker";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  const ctx = await getActiveContext();

  const shipments = await prisma.shipment.findMany({
    where: entityScope(ctx),
    include: { party: true },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  // Attention-first ordering (delayed/in-transit first), then by ETA ascending.
  const sorted = [...shipments].sort((a, b) => {
    const w = statusSortWeight(a.status) - statusSortWeight(b.status);
    if (w !== 0) return w;
    const ae = a.estimatedArrivalAt ? a.estimatedArrivalAt.getTime() : Infinity;
    const be = b.estimatedArrivalAt ? b.estimatedArrivalAt.getTime() : Infinity;
    if (ae !== be) return ae - be;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const tracked: TrackedShipment[] = sorted.map((s) => {
    const origin = cityByName(s.originCity ?? "Karachi");
    const dest = cityByName(s.destinationCity);
    const hint = etaHint(s.estimatedArrivalAt, s.status, now);
    return {
      id: s.id,
      reference: s.reference ?? s.id.slice(0, 8),
      destCity: s.destinationCity,
      originXY: origin ? project(origin.lng, origin.lat) : KARACHI_XY,
      destXY: dest ? project(dest.lng, dest.lat) : project(74.34, 31.55), // fallback: Lahore
      status: s.status,
      statusLabel: isShipmentStatus(s.status) ? STATUS_LABELS[s.status] : s.status,
      etaLabel: s.estimatedArrivalAt ? dateShort(s.estimatedArrivalAt) : null,
      etaHint: hint.text,
      etaTone: hint.tone,
      carrier: s.carrier ? `via ${s.carrier}` : null,
      consignee: s.party?.name ?? null,
      note: s.status === "delayed" ? (s.notes ?? "Behind schedule — in transit but delayed.") : s.notes,
      prog: progressFor(s.status, s.departureAt, s.estimatedArrivalAt, now),
    };
  });

  return (
    <div className="animate-rise space-y-5">
      <PageHeader
        eyebrow="Operations"
        title="Shipments"
        subtitle="Karachi cold-chain dispatches heading north."
        action={
          <PrimaryButton href="/shipments/new" data-testid="ship-new-link">
            + New shipment
          </PrimaryButton>
        }
      />

      {tracked.length === 0 ? (
        <p className="text-sm text-faint">
          No shipments yet.{" "}
          <Link href="/shipments/new" className="font-semibold text-accent-deep hover:underline">
            Create one →
          </Link>
        </p>
      ) : (
        <ShipmentTracker shipments={tracked} />
      )}
    </div>
  );
}
