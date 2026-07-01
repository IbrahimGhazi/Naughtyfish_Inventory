"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShipment } from "../actions";

export interface FormStore {
  id: string;
  name: string;
  city: string | null;
}
export interface FormParty {
  id: string;
  name: string;
}
export interface FormInvoice {
  id: string;
  invoiceNumber: number;
  partyId: string;
  partyName: string;
}

/**
 * Format a Date as the `YYYY-MM-DDTHH:mm` string a <input type="datetime-local">
 * expects, in LOCAL time. (toISOString() would be UTC and shift the value.)
 */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse a datetime-local string back to a Date (local), or null if empty/invalid. */
function fromLocalInput(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const ETA_PRESETS: { label: string; ms: number }[] = [
  { label: "+6h", ms: 6 * HOUR },
  { label: "+1 day", ms: 1 * DAY },
  { label: "+2 days", ms: 2 * DAY },
  { label: "+3 days", ms: 3 * DAY },
];

export default function ShipmentForm({
  cities,
  stores,
  parties,
  invoices,
}: {
  cities: string[];
  stores: FormStore[];
  parties: FormParty[];
  invoices: FormInvoice[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [reference, setReference] = useState("");
  const [originName, setOriginName] = useState("");
  const [originCity, setOriginCity] = useState("Karachi");
  const [originStoreId, setOriginStoreId] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [destinationCity, setDestinationCity] = useState("Lahore");
  const [departureAt, setDepartureAt] = useState("");
  const [estimatedArrivalAt, setEstimatedArrivalAt] = useState("");
  const [carrier, setCarrier] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [partyId, setPartyId] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);

  const storeById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const invoiceById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  const canSubmit = !!originName.trim() && !!originCity && !!destinationCity && !isPending;

  // Selecting an origin store auto-fills origin name + city.
  function pickStore(id: string) {
    setOriginStoreId(id);
    const store = storeById.get(id);
    if (store) {
      setOriginName(store.name);
      if (store.city && cities.includes(store.city)) setOriginCity(store.city);
    }
  }

  // Linking an invoice auto-sets the consignee party.
  function pickInvoice(id: string) {
    setInvoiceId(id);
    const inv = invoiceById.get(id);
    if (inv) setPartyId(inv.partyId);
  }

  function setDepartureNow() {
    setDepartureAt(toLocalInput(new Date()));
  }

  // ETA presets are relative to the chosen departure if set, else "now".
  function applyEtaPreset(ms: number) {
    const base = fromLocalInput(departureAt) ?? new Date();
    setEstimatedArrivalAt(toLocalInput(new Date(base.getTime() + ms)));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await createShipment({
          reference: reference || undefined,
          originName: originName.trim(),
          originCity,
          originStoreId: originStoreId || undefined,
          destinationName: destinationName || undefined,
          destinationCity,
          departureAt: departureAt || undefined,
          estimatedArrivalAt: estimatedArrivalAt || undefined,
          carrier: carrier || undefined,
          driverName: driverName || undefined,
          driverPhone: driverPhone || undefined,
          invoiceId: invoiceId || undefined,
          partyId: partyId || undefined,
          notes: notes || undefined,
        });
        router.push(`/shipments/${res.id}`);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Origin */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Origin</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="From store" hint="auto-fills name & city">
            <select
              className="input"
              data-testid="ship-origin-store"
              value={originStoreId}
              onChange={(e) => pickStore(e.target.value)}
            >
              <option value="">— none —</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Origin name">
            <input
              className="input"
              data-testid="ship-origin-name"
              placeholder="e.g. Karachi — Own Store"
              value={originName}
              onChange={(e) => setOriginName(e.target.value)}
            />
          </Field>
          <Field label="Origin city">
            <select
              className="input"
              data-testid="ship-origin-city"
              value={originCity}
              onChange={(e) => setOriginCity(e.target.value)}
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* Destination */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Destination</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Destination name" hint="optional">
            <input
              className="input"
              data-testid="ship-dest-name"
              placeholder="e.g. Lahore — PC Lahore warehouse"
              value={destinationName}
              onChange={(e) => setDestinationName(e.target.value)}
            />
          </Field>
          <Field label="Destination city">
            <select
              className="input"
              data-testid="ship-dest-city"
              value={destinationCity}
              onChange={(e) => setDestinationCity(e.target.value)}
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* Schedule */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Schedule</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Departure">
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                className="input"
                data-testid="ship-departure"
                value={departureAt}
                onChange={(e) => setDepartureAt(e.target.value)}
              />
              <button
                type="button"
                onClick={setDepartureNow}
                data-testid="ship-departure-now"
                className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Now
              </button>
            </div>
          </Field>
          <Field label="Estimated arrival (ETA)">
            <div className="space-y-2">
              <input
                type="datetime-local"
                className="input"
                data-testid="ship-eta"
                value={estimatedArrivalAt}
                onChange={(e) => setEstimatedArrivalAt(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                {ETA_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyEtaPreset(p.ms)}
                    data-testid={`ship-eta-preset-${p.label.replace(/\s+/g, "")}`}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </Field>
        </div>
      </section>

      {/* Details */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Details</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Reference" hint="optional label">
            <input
              className="input"
              data-testid="ship-reference"
              placeholder="e.g. TRK-Lahore-01"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>
          <Field label="Carrier" hint="transport company / truck">
            <input
              className="input"
              data-testid="ship-carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </Field>
          <Field label="Driver name">
            <input
              className="input"
              data-testid="ship-driver-name"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
            />
          </Field>
          <Field label="Driver phone">
            <input
              className="input"
              data-testid="ship-driver-phone"
              inputMode="tel"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
            />
          </Field>
          <Field label="Link invoice" hint="auto-sets consignee">
            <select
              className="input"
              data-testid="ship-invoice"
              value={invoiceId}
              onChange={(e) => pickInvoice(e.target.value)}
            >
              <option value="">— none —</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  #{i.invoiceNumber} · {i.partyName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Consignee party">
            <select
              className="input"
              data-testid="ship-party"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
            >
              <option value="">— none —</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                className="input"
                data-testid="ship-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={!canSubmit}
          data-testid="ship-submit"
          className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-40"
        >
          {isPending ? "Creating…" : "Create shipment"}
        </button>
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
        {hint && <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}
