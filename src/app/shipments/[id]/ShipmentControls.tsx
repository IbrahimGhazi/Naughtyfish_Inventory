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
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Actions</h2>

      {/* Status change buttons */}
      <div className="mb-4">
        <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Set status</div>
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
                className={`rounded-md border px-3 py-1.5 text-sm font-medium disabled:cursor-default ${
                  active
                    ? "border-cyan-700 bg-cyan-700 text-white dark:border-cyan-500 dark:bg-cyan-600"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ETA quick-edit */}
      <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Update ETA</div>
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
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={saveEta}
            disabled={isPending}
            data-testid="ship-eta-save"
            className="rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Save ETA"}
          </button>
        </div>
      </div>

      {(ok || error) && (
        <div className="mt-3 text-xs">
          {ok && <span className="text-emerald-600 dark:text-emerald-400">✓ {ok}</span>}
          {error && <span className="text-red-600 dark:text-red-400">{error}</span>}
        </div>
      )}
    </section>
  );
}
