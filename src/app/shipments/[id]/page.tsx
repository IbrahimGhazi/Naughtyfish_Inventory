import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { dateShort } from "@/lib/format";
import { BackLink, Card, StatusChip } from "@/components/ui";
import {
  STATUS_LABELS,
  STATUS_TIMELINE,
  etaHint,
  type ShipmentStatus,
  type EtaTone,
} from "@/lib/shipments";
import ShipmentControls from "./ShipmentControls";

export const dynamic = "force-dynamic";

const ETA_TONE_CLASS: Record<EtaTone, string> = {
  muted: "text-faint",
  info: "text-accent",
  warn: "text-warn",
  danger: "text-neg",
  good: "text-pos",
};

function dateTime(d: Date): string {
  return `${dateShort(d)} · ${new Date(d).toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** datetime-local string (local time) for pre-filling the ETA quick-edit input. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveContext();

  const shipment = await prisma.shipment.findFirst({
    where: { id, ...entityScope(ctx) },
    include: {
      party: true,
      invoice: true,
      originStore: true,
    },
  });
  if (!shipment) notFound();

  const now = new Date();
  const hint = etaHint(shipment.estimatedArrivalAt, shipment.status, now);
  const statusLabel = STATUS_LABELS[shipment.status as ShipmentStatus] ?? shipment.status;

  // Timeline progress: how far along the preparing→in_transit→delivered flow.
  // delayed reads as "in transit but stuck"; cancelled shows no active step.
  const reachedIndex =
    shipment.status === "delivered"
      ? 2
      : shipment.status === "in_transit" || shipment.status === "delayed"
        ? 1
        : shipment.status === "preparing"
          ? 0
          : -1; // cancelled

  return (
    <div className="animate-rise space-y-5">
      <div>
        <BackLink href="/shipments">← Shipments</BackLink>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-serif text-[28px] font-semibold leading-tight text-ink">
            {shipment.reference ?? `Shipment ${shipment.id.slice(0, 8)}`}
          </h1>
          <span data-testid="ship-detail-status">
            <StatusChip status={shipment.status} label={statusLabel} />
          </span>
        </div>
      </div>

      {/* Route summary */}
      <Card className="p-[18px]">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="text-[12px] text-muted">{shipment.originName}</div>
            <div className="font-serif text-[20px] font-semibold text-ink">
              {shipment.originCity ?? "—"}
            </div>
          </div>
          <span className="font-serif text-2xl text-faint">→</span>
          <div>
            <div className="text-[12px] text-muted">{shipment.destinationName ?? " "}</div>
            <div className="font-serif text-[20px] font-semibold text-ink">
              {shipment.destinationCity}
            </div>
          </div>
        </div>
      </Card>

      {/* Visual timeline: preparing → in_transit → delivered */}
      <Card className="p-[18px]">
        <h2 className="mb-4 font-serif text-[17px] font-semibold text-ink">Progress</h2>
        <ol className="flex items-center" data-testid="ship-timeline">
          {STATUS_TIMELINE.map((step, i) => {
            const done = reachedIndex >= i;
            const isCurrent = reachedIndex === i;
            // delayed shipments show the in_transit node in a warning tone.
            const stuck = shipment.status === "delayed" && step === "in_transit";
            const cancelled = shipment.status === "cancelled";
            return (
              <li key={step} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <span
                    data-testid={`ship-timeline-${step}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full border font-mono text-xs font-semibold"
                    style={
                      cancelled
                        ? {
                            borderColor: "var(--hair)",
                            background: "var(--card2)",
                            color: "var(--faint)",
                          }
                        : stuck
                          ? {
                              borderColor: "var(--neg)",
                              background: "var(--neg)",
                              color: "var(--card)",
                            }
                          : done
                            ? {
                                borderColor: "var(--accent)",
                                background: "var(--accent)",
                                color: "var(--on-accent)",
                              }
                            : {
                                borderColor: "var(--hair)",
                                background: "var(--card)",
                                color: "var(--faint)",
                              }
                    }
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`mt-1 text-xs ${
                      isCurrent && !cancelled
                        ? "font-semibold text-accent"
                        : "text-faint"
                    }`}
                  >
                    {STATUS_LABELS[step]}
                  </span>
                </div>
                {i < STATUS_TIMELINE.length - 1 && (
                  <div
                    className="mx-2 h-0.5 flex-1"
                    style={{
                      background:
                        !cancelled && reachedIndex > i ? "var(--accent)" : "var(--row)",
                    }}
                  />
                )}
              </li>
            );
          })}
        </ol>
        {shipment.status === "delayed" && (
          <p className="mt-3 text-xs font-semibold text-neg">
            Marked delayed — in transit but behind schedule.
          </p>
        )}
        {shipment.status === "cancelled" && (
          <p className="mt-3 text-xs text-faint">This shipment was cancelled.</p>
        )}
      </Card>

      {/* Facts grid */}
      <Card className="p-[18px]">
        <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">Details</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Fact label="Departure">{shipment.departureAt ? dateTime(shipment.departureAt) : "—"}</Fact>
          <Fact label="ETA">
            {shipment.estimatedArrivalAt ? dateTime(shipment.estimatedArrivalAt) : "—"}
            <span className={`ml-2 text-xs ${ETA_TONE_CLASS[hint.tone]}`}>{hint.text}</span>
          </Fact>
          <Fact label="Delivered at">
            {shipment.deliveredAt ? dateTime(shipment.deliveredAt) : "—"}
          </Fact>
          <Fact label="Carrier">{shipment.carrier ?? "—"}</Fact>
          <Fact label="Driver">
            {shipment.driverName ?? "—"}
            {shipment.driverPhone ? (
              <span className="ml-1 text-faint">· {shipment.driverPhone}</span>
            ) : null}
          </Fact>
          <Fact label="Origin store">{shipment.originStore?.name ?? "—"}</Fact>
          <Fact label="Consignee">
            {shipment.party ? (
              <Link
                href={`/parties/${shipment.partyId}`}
                className="text-accent hover:underline"
              >
                {shipment.party.name}
              </Link>
            ) : (
              "—"
            )}
          </Fact>
          <Fact label="Linked invoice">
            {shipment.invoice ? (
              <Link
                href={`/invoices/${shipment.invoiceId}`}
                className="font-mono text-accent hover:underline"
              >
                #{shipment.invoice.invoiceNumber}
              </Link>
            ) : (
              "—"
            )}
          </Fact>
        </dl>
        {shipment.notes && (
          <div className="mt-4 border-t border-row pt-3">
            <div className="text-xs font-medium text-muted">Notes</div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text">{shipment.notes}</p>
          </div>
        )}
      </Card>

      {/* Status + ETA controls (client) */}
      <ShipmentControls
        shipmentId={shipment.id}
        status={shipment.status}
        etaValue={shipment.estimatedArrivalAt ? toLocalInput(shipment.estimatedArrivalAt) : ""}
      />
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-text">{children}</dd>
    </div>
  );
}
