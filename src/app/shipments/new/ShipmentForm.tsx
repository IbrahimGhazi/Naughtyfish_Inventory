"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCopy } from "@/lib/copy/CopyProvider";
import {
  SHIPMENT_TYPES,
  SHIPMENT_TYPE_LABELS,
  TRANSPORT_MODES,
  TRANSPORT_MODE_LABELS,
  type ShipmentType,
  type TransportMode,
} from "@/lib/shipments";
import { type ProcessType } from "@/lib/enums";
import ProcessTypesPicker from "@/components/ProcessTypesPicker";
import { kg } from "@/lib/format";
import { createShipment } from "../actions";

export interface FormStore {
  id: string;
  name: string;
  city: string | null;
  capabilities: string[];
}
export interface FormItem {
  id: string;
  name: string;
  nature: string;
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
  items,
  parties,
  invoices,
  defaultOriginCity = "Karachi",
}: {
  cities: string[];
  stores: FormStore[];
  items: FormItem[];
  parties: FormParty[];
  invoices: FormInvoice[];
  /** White-label: platform-config origin city. */
  defaultOriginCity?: string;
}) {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [reference, setReference] = useState("");
  const [shipmentType, setShipmentType] = useState<ShipmentType>("bulk_long_haul");
  const [transportMode, setTransportMode] = useState<TransportMode>("road");
  const [originName, setOriginName] = useState("");
  const [originCity, setOriginCity] = useState(defaultOriginCity);
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

  // Inter-store transfer payload (revealed when the delivery type is inter_store).
  const [destinationStoreId, setDestinationStoreId] = useState("");
  const [transferItemId, setTransferItemId] = useState("");
  const [transferKg, setTransferKg] = useState("");
  const [applyProcess, setApplyProcess] = useState(false);
  const [transferTypes, setTransferTypes] = useState<ProcessType[]>([]);
  const [outputItemId, setOutputItemId] = useState("");
  const [outputKg, setOutputKg] = useState("");

  const [error, setError] = useState<string | null>(null);

  const storeById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const invoiceById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);

  const isInterStore = shipmentType === "inter_store";
  const destStore = storeById.get(destinationStoreId);
  const destCaps = destStore?.capabilities;
  const inKgT = Number(transferKg);
  const outKgT = Number(outputKg);
  const bothKgT = transferKg.trim() !== "" && outputKg.trim() !== "" && !Number.isNaN(inKgT) && !Number.isNaN(outKgT);
  const lossT = bothKgT ? Math.round((inKgT - outKgT) * 1000) / 1000 : null;

  const interStoreOk =
    !isInterStore ||
    (!!originStoreId &&
      !!destinationStoreId &&
      destinationStoreId !== originStoreId &&
      !!transferItemId &&
      inKgT > 0 &&
      (!applyProcess ||
        (transferTypes.length > 0 &&
          (!destCaps || transferTypes.every((x) => destCaps.includes(x))) &&
          !!outputItemId &&
          outKgT > 0 &&
          lossT !== null &&
          lossT >= 0)));

  const canSubmit =
    !!originName.trim() && !!originCity && !!destinationCity && interStoreOk && !isPending;

  // Selecting an origin store auto-fills origin name + city.
  function pickStore(id: string) {
    setOriginStoreId(id);
    const store = storeById.get(id);
    if (store) {
      setOriginName(store.name);
      if (store.city && cities.includes(store.city)) setOriginCity(store.city);
    }
  }

  // Selecting a destination store auto-fills destination name + city.
  function pickDestStore(id: string) {
    setDestinationStoreId(id);
    const store = storeById.get(id);
    if (store) {
      setDestinationName(store.name);
      if (store.city && cities.includes(store.city)) setDestinationCity(store.city);
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
          shipmentType,
          transportMode,
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
          destinationStoreId: isInterStore ? destinationStoreId || undefined : undefined,
          transferItemId: isInterStore ? transferItemId || undefined : undefined,
          transferKg: isInterStore && transferKg ? Number(transferKg) : undefined,
          applyProcess: isInterStore ? applyProcess : undefined,
          processTypes: isInterStore && applyProcess ? transferTypes : undefined,
          outputItemId: isInterStore && applyProcess ? outputItemId || undefined : undefined,
          outputKg: isInterStore && applyProcess && outputKg ? Number(outputKg) : undefined,
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
      {/* Type + transport mode */}
      <section className="rounded-xl border border-hair bg-card p-[18px]">
        <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">Type</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Delivery type">
            <select
              className="input"
              data-testid="ship-type"
              value={shipmentType}
              onChange={(e) => setShipmentType(e.target.value as ShipmentType)}
            >
              {SHIPMENT_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {SHIPMENT_TYPE_LABELS[ty]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Transport">
            <select
              className="input"
              data-testid="ship-mode"
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value as TransportMode)}
            >
              {TRANSPORT_MODES.map((m) => (
                <option key={m} value={m}>
                  {TRANSPORT_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* Origin */}
      <section className="rounded-xl border border-hair bg-card p-[18px]">
        <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">{t("shipments.form.originHeading")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t("shipments.form.fromStore")} hint={t("shipments.form.fromStoreHint")}>
            <select
              className="input"
              data-testid="ship-origin-store"
              value={originStoreId}
              onChange={(e) => pickStore(e.target.value)}
            >
              <option value="">{t("shipments.form.optionNone")}</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("shipments.form.originName")}>
            <input
              className="input"
              data-testid="ship-origin-name"
              placeholder={t("shipments.form.originNamePlaceholder")}
              value={originName}
              onChange={(e) => setOriginName(e.target.value)}
            />
          </Field>
          <Field label={t("shipments.form.originCity")}>
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
      <section className="rounded-xl border border-hair bg-card p-[18px]">
        <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">{t("shipments.form.destHeading")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("shipments.form.destName")} hint={t("shipments.form.destNameHint")}>
            <input
              className="input"
              data-testid="ship-dest-name"
              placeholder={t("shipments.form.destNamePlaceholder")}
              value={destinationName}
              onChange={(e) => setDestinationName(e.target.value)}
            />
          </Field>
          <Field label={t("shipments.form.destCity")}>
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

      {/* Inter-store transfer (revealed when the delivery type is a store-to-store move) */}
      {isInterStore && (
        <section className="rounded-xl border border-hair bg-card p-[18px]">
          <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">{t("shipments.form.transferHeading")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("shipments.form.destStore")} hint={t("shipments.form.destStoreHint")}>
              <select
                className="input"
                data-testid="ship-dest-store"
                value={destinationStoreId}
                onChange={(e) => pickDestStore(e.target.value)}
              >
                <option value="">{t("shipments.form.optionNone")}</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("shipments.form.transferItem")}>
              <select
                className="input"
                data-testid="ship-transfer-item"
                value={transferItemId}
                onChange={(e) => setTransferItemId(e.target.value)}
              >
                <option value="">{t("shipments.form.optionNone")}</option>
                <optgroup label={t("shipments.form.natureRaw")}>
                  {items.filter((i) => i.nature === "raw").map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </optgroup>
                <optgroup label={t("shipments.form.natureProcessed")}>
                  {items.filter((i) => i.nature === "processed").map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </optgroup>
              </select>
            </Field>
            <Field label={t("shipments.form.transferKg")}>
              <input
                className="input font-mono"
                data-testid="ship-transfer-kg"
                inputMode="decimal"
                value={transferKg}
                onChange={(e) => setTransferKg(e.target.value)}
              />
            </Field>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-text">
            <input
              type="checkbox"
              data-testid="ship-apply-process"
              className="h-4 w-4 accent-[var(--accent)]"
              checked={applyProcess}
              onChange={(e) => setApplyProcess(e.target.checked)}
            />
            {t("shipments.form.applyProcess")}
          </label>
          {applyProcess && (
            <div className="mt-3 space-y-3">
              <Field
                label={t("shipments.form.transferTypes")}
                hint={destinationStoreId ? undefined : t("processes.form.types.pickStoreFirst")}
              >
                <ProcessTypesPicker
                  value={transferTypes}
                  onChange={setTransferTypes}
                  allowed={destCaps}
                  idPrefix="ship-transfer"
                  disabledReason={t("processes.form.types.pickStoreFirst")}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t("shipments.form.transferOutItem")}>
                  <select
                    className="input"
                    data-testid="ship-transfer-out-item"
                    value={outputItemId}
                    onChange={(e) => setOutputItemId(e.target.value)}
                  >
                    <option value="">{t("shipments.form.optionNone")}</option>
                    {items.filter((i) => i.nature === "processed").map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t("shipments.form.transferOutKg")}>
                  <input
                    className="input font-mono"
                    data-testid="ship-transfer-out-kg"
                    inputMode="decimal"
                    value={outputKg}
                    onChange={(e) => setOutputKg(e.target.value)}
                  />
                </Field>
              </div>
              {lossT !== null && (
                <div className="text-[12px] text-faint">
                  {t("shipments.form.transferLoss")}:{" "}
                  <strong className={`font-mono ${lossT < 0 ? "text-neg" : "text-text"}`}>{kg(lossT)}</strong>
                </div>
              )}
            </div>
          )}
          <p className="mt-3 text-[12px] text-faint">{t("shipments.form.transferOnDelivery")}</p>
        </section>
      )}

      {/* Schedule */}
      <section className="rounded-xl border border-hair bg-card p-[18px]">
        <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">{t("shipments.form.scheduleHeading")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("shipments.form.departure")}>
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
                className="shrink-0 rounded-lg border border-hair px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-card2"
              >
                {t("shipments.form.departureNow")}
              </button>
            </div>
          </Field>
          <Field label={t("shipments.form.eta")}>
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
                    className="rounded-lg border border-hair px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-card2"
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
      <section className="rounded-xl border border-hair bg-card p-[18px]">
        <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">{t("shipments.form.detailsHeading")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("shipments.form.reference")} hint={t("shipments.form.referenceHint")}>
            <input
              className="input"
              data-testid="ship-reference"
              placeholder={t("shipments.form.referencePlaceholder")}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>
          <Field label={t("shipments.form.carrier")} hint={t("shipments.form.carrierHint")}>
            <input
              className="input"
              data-testid="ship-carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
            />
          </Field>
          <Field label={t("shipments.form.driverName")}>
            <input
              className="input"
              data-testid="ship-driver-name"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
            />
          </Field>
          <Field label={t("shipments.form.driverPhone")}>
            <input
              className="input"
              data-testid="ship-driver-phone"
              inputMode="tel"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
            />
          </Field>
          <Field label={t("shipments.form.linkInvoice")} hint={t("shipments.form.linkInvoiceHint")}>
            <select
              className="input"
              data-testid="ship-invoice"
              value={invoiceId}
              onChange={(e) => pickInvoice(e.target.value)}
            >
              <option value="">{t("shipments.form.optionNone")}</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  #{i.invoiceNumber} · {i.partyName}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("shipments.form.consignee")}>
            <select
              className="input"
              data-testid="ship-party"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
            >
              <option value="">{t("shipments.form.optionNone")}</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("shipments.form.notes")}>
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
          className="rounded-lg px-4 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? t("shipments.form.creating") : t("shipments.form.createSubmit")}
        </button>
        {error && <span className="text-xs text-neg">{error}</span>}
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
      <span className="mb-1 block text-xs font-medium text-muted">
        {label}
        {hint && <span className="ml-1 font-normal text-faint">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}
