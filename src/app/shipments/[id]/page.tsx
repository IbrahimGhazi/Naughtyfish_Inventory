import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveContext } from "@/lib/session";
import { entityScope } from "@/lib/scope";
import { dateShort } from "@/lib/format";
import {
  STATUS_LABELS,
  STATUS_TIMELINE,
  statusColor,
  etaHint,
  type ShipmentStatus,
  type EtaTone,
} from "@/lib/shipments";
import ShipmentControls from "./ShipmentControls";

export const dynamic = "force-dynamic";

const ETA_TONE_CLASS: Record<EtaTone, string> = {
  muted: "text-slate-400 dark:text-slate-500",
  info: "text-cyan-700 dark:text-cyan-400",
  warn: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  good: "text-emerald-600 dark:text-emerald-400",
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/shipments"
            className="text-sm text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-400"
          >
            ← Shipments
          </Link>
          <h1 className="text-xl font-semibold">
            {shipment.reference ?? `Shipment ${shipment.id.slice(0, 8)}`}
          </h1>
        </div>
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(shipment.status)}`}
          data-testid="ship-detail-status"
        >
          {statusLabel}
        </span>
      </div>

      {/* Route summary */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 text-lg font-medium">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{shipment.originName}</div>
            <div>{shipment.originCity ?? "—"}</div>
          </div>
          <span className="text-slate-400 dark:text-slate-500">→</span>
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {shipment.destinationName ?? " "}
            </div>
            <div>{shipment.destinationCity}</div>
          </div>
        </div>
      </section>

      {/* Visual timeline: preparing → in_transit → delivered */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Progress</h2>
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
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                      cancelled
                        ? "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                        : stuck
                          ? "border-red-500 bg-red-500 text-white dark:border-red-500 dark:bg-red-600"
                          : done
                            ? "border-cyan-700 bg-cyan-700 text-white dark:border-cyan-500 dark:bg-cyan-600"
                            : "border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`mt-1 text-xs ${
                      isCurrent && !cancelled
                        ? "font-medium text-cyan-700 dark:text-cyan-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {STATUS_LABELS[step]}
                  </span>
                </div>
                {i < STATUS_TIMELINE.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 ${
                      !cancelled && reachedIndex > i
                        ? "bg-cyan-700 dark:bg-cyan-600"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
        {shipment.status === "delayed" && (
          <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">
            Marked delayed — in transit but behind schedule.
          </p>
        )}
        {shipment.status === "cancelled" && (
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">This shipment was cancelled.</p>
        )}
      </section>

      {/* Facts grid */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Details</h2>
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
              <span className="ml-1 text-slate-400 dark:text-slate-500">· {shipment.driverPhone}</span>
            ) : null}
          </Fact>
          <Fact label="Origin store">{shipment.originStore?.name ?? "—"}</Fact>
          <Fact label="Consignee">
            {shipment.party ? (
              <Link
                href={`/parties/${shipment.partyId}`}
                className="text-cyan-700 hover:underline dark:text-cyan-400"
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
                className="font-mono text-cyan-700 hover:underline dark:text-cyan-400"
              >
                #{shipment.invoice.invoiceNumber}
              </Link>
            ) : (
              "—"
            )}
          </Fact>
        </dl>
        {shipment.notes && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Notes</div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{shipment.notes}</p>
          </div>
        )}
      </section>

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
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
