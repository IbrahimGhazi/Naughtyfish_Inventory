"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStore, updateStore } from "../actions";
import { Field, EditToggle } from "../ui";
import { STORE_OWNERSHIP, PROCESS_TYPE_LABELS, type ProcessType } from "@/lib/enums";
import ProcessTypesPicker from "@/components/ProcessTypesPicker";
import { useCopy } from "@/lib/copy/CopyProvider";

export interface StoreRow {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  ownershipType: string;
  processCapabilities: string[];
}

const REGIONS = ["north", "south"] as const;

/** Add a new store. */
export function AddStoreForm() {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [ownershipType, setOwnershipType] = useState<string>("own");
  const [capabilities, setCapabilities] = useState<ProcessType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const canSubmit = !!name.trim() && !isPending;

  function submit() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await createStore({
          name: name.trim(),
          city: city.trim() || undefined,
          region: (region || undefined) as "north" | "south" | undefined,
          ownershipType: ownershipType as (typeof STORE_OWNERSHIP)[number],
          processCapabilities: capabilities,
        });
        setName("");
        setCity("");
        setRegion("");
        setOwnershipType("own");
        setCapabilities([]);
        setOk(true);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label={t("settings.stores.field.name")}>
          <input
            className="input"
            data-testid="store-add-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={t("settings.stores.field.city")} hint={t("settings.stores.field.cityHint")}>
          <input
            className="input"
            data-testid="store-add-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </Field>
        <Field label={t("settings.stores.field.region")} hint={t("settings.stores.field.regionHint")}>
          <select
            className="input"
            data-testid="store-add-region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">—</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("settings.stores.field.ownership")}>
          <select
            className="input"
            data-testid="store-add-ownership"
            value={ownershipType}
            onChange={(e) => setOwnershipType(e.target.value)}
          >
            {STORE_OWNERSHIP.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("settings.stores.field.capabilities")} hint={t("settings.stores.field.capabilitiesHint")}>
        <ProcessTypesPicker value={capabilities} onChange={setCapabilities} idPrefix="store-add" />
      </Field>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          data-testid="store-add-submit"
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? t("settings.stores.add.adding") : t("settings.stores.add.submit")}
        </button>
        {ok && <span className="text-xs font-medium text-pos">{t("settings.stores.saved")}</span>}
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

/** Inline edit form for a store (rename + city/region/ownership). */
function EditStoreForm({ store, onDone }: { store: StoreRow; onDone: () => void }) {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(store.name);
  const [city, setCity] = useState(store.city ?? "");
  const [region, setRegion] = useState(store.region ?? "");
  const [ownershipType, setOwnershipType] = useState(store.ownershipType);
  const [capabilities, setCapabilities] = useState<ProcessType[]>(
    store.processCapabilities as ProcessType[],
  );
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!name.trim() && !isPending;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await updateStore({
          id: store.id,
          name: name.trim(),
          city: city.trim() || undefined,
          region: (region || undefined) as "north" | "south" | undefined,
          ownershipType: ownershipType as (typeof STORE_OWNERSHIP)[number],
          processCapabilities: capabilities,
        });
        router.refresh();
        onDone();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label={t("settings.stores.field.name")}>
          <input
            className="input"
            data-testid={`store-edit-name-${store.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={t("settings.stores.field.city")}>
          <input
            className="input"
            data-testid={`store-edit-city-${store.id}`}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </Field>
        <Field label={t("settings.stores.field.region")}>
          <select
            className="input"
            data-testid={`store-edit-region-${store.id}`}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">—</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("settings.stores.field.ownership")}>
          <select
            className="input"
            data-testid={`store-edit-ownership-${store.id}`}
            value={ownershipType}
            onChange={(e) => setOwnershipType(e.target.value)}
          >
            {STORE_OWNERSHIP.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("settings.stores.field.capabilities")} hint={t("settings.stores.field.capabilitiesHint")}>
        <ProcessTypesPicker value={capabilities} onChange={setCapabilities} idPrefix={`store-edit-${store.id}`} />
      </Field>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          data-testid={`store-edit-save-${store.id}`}
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? t("settings.stores.edit.saving") : t("settings.stores.edit.save")}
        </button>
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

/** List of stores with per-row inline edit. */
export function StoreList({ stores }: { stores: StoreRow[] }) {
  const t = useCopy();
  if (stores.length === 0) {
    return <p className="text-sm text-faint">{t("settings.stores.empty")}</p>;
  }
  return (
    <ul className="divide-y divide-row">
      {stores.map((s) => (
        <li key={s.id} data-testid={`store-row-${s.id}`}>
          <EditToggle
            testId={`store-${s.id}`}
            summary={
              <div>
                <div className="font-medium text-ink">{s.name}</div>
                <div className="text-xs text-faint">
                  {[s.city, s.region, s.ownershipType].filter(Boolean).join(" · ") || "—"}
                </div>
                {s.processCapabilities.length > 0 && (
                  <div className="text-xs text-faint">
                    {t("settings.stores.row.doesPrefix")}{" "}
                    {s.processCapabilities
                      .map((c) => PROCESS_TYPE_LABELS[c as ProcessType] ?? c)
                      .join(", ")}
                  </div>
                )}
              </div>
            }
          >
            {(close) => <EditStoreForm store={s} onDone={close} />}
          </EditToggle>
        </li>
      ))}
    </ul>
  );
}
