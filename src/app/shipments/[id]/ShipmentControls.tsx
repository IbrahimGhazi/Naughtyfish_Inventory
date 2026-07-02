"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateShipmentStatus, updateShipmentEta } from "../actions";
import { SHIPMENT_STATUSES, STATUS_LABELS, type ShipmentStatus } from "@/lib/shipments";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const ETA_PRESETS: { label: string; ms: number }[] = [
  { label: "+6h", ms: 6 * HOUR },
  { label: "+1 day", ms: 1 * DAY },
  { label: "+2 days", ms: 2 * DAY },
  { label: "+3 days", ms: 3 * DAY },
];

export default function ShipmentControls({
  shipmentId,
  status,
  etaValue,
}: {
  shipmentId: string;
  status: string;
  etaValue: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [eta, setEta] = useState(etaValue);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function changeStatus(next: ShipmentStatus) {
    if (next === status) return;
    setError(null);
    setOk(null);
    startTransition(async () => {
      try {
        await updateShipmentStatus({ shipmentId, status: next });
        setOk(`Status → ${STATUS_LABELS[next]}`);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function saveEta() {
    setError(null);
    setOk(null);
    startTransition(async () => {
      try {
        await updateShipmentEta({ shipmentId, estimatedArrivalAt: eta || undefined });
        setOk("ETA updated");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function applyEtaPreset(ms: number) {
    const base = fromLocalInput(eta) ?? new Date();
    setEta(toLocalInput(new Date(base.getTime() + ms)));
  }

  return (
    <section className="rounded-xl border border-hair bg-card p-[18px]">
      <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">Actions</h2>

      {/* Status change buttons */}
      <div className="mb-4">
        <div className="mb-2 text-xs font-medium text-muted">Set status</div>
        <div className="flex flex-wrap gap-2" data-testid="ship-status-buttons">
          {SHIPMENT_STATUSES.map((s) => {
            const active = s === status;
            return (
              <button
                key={s}
                type="button"
                disabled={active || isPending}
                onClick={() => changeStatus(s)}
                data-testid={`ship-set-${s}`}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-default ${
                  active
                    ? "border-transparent text-accent-deep"
                    : "border-hair bg-card text-muted hover:bg-card2 disabled:opacity-40"
                }`}
                style={active ? { background: "var(--accent-tint)" } : undefined}
              >
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ETA quick-edit */}
      <div className="border-t border-row pt-4">
        <div className="mb-2 text-xs font-medium text-muted">Update ETA</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            className="input max-w-xs"
            data-testid="ship-eta-edit"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
          />
          {ETA_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyEtaPreset(p.ms)}
              data-testid={`ship-eta-edit-preset-${p.label.replace(/\s+/g, "")}`}
              className="rounded-lg border border-hair px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-card2"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={saveEta}
            disabled={isPending}
            data-testid="ship-eta-save"
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {isPending ? "Saving…" : "Save ETA"}
          </button>
        </div>
      </div>

      {(ok || error) && (
        <div className="mt-3 text-xs">
          {ok && <span className="text-pos">✓ {ok}</span>}
          {error && <span className="text-neg">{error}</span>}
        </div>
      )}
    </section>
  );
}
