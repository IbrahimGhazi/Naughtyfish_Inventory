"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStore, updateStore } from "../actions";
import { Field, EditToggle } from "../ui";
import { STORE_OWNERSHIP } from "@/lib/enums";

export interface StoreRow {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  ownershipType: string;
}

const REGIONS = ["north", "south"] as const;

/** Add a new store. */
export function AddStoreForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [ownershipType, setOwnershipType] = useState<string>("own");
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
        });
        setName("");
        setCity("");
        setRegion("");
        setOwnershipType("own");
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
        <Field label="Name">
          <input
            className="input"
            data-testid="store-add-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="City" hint="optional">
          <input
            className="input"
            data-testid="store-add-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </Field>
        <Field label="Region" hint="optional">
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
        <Field label="Ownership">
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
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          data-testid="store-add-submit"
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-[#F6F2E6] transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Adding…" : "+ Add store"}
        </button>
        {ok && <span className="text-xs font-medium text-pos">✓ Saved.</span>}
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

/** Inline edit form for a store (rename + city/region/ownership). */
function EditStoreForm({ store, onDone }: { store: StoreRow; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(store.name);
  const [city, setCity] = useState(store.city ?? "");
  const [region, setRegion] = useState(store.region ?? "");
  const [ownershipType, setOwnershipType] = useState(store.ownershipType);
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
        <Field label="Name">
          <input
            className="input"
            data-testid={`store-edit-name-${store.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="City">
          <input
            className="input"
            data-testid={`store-edit-city-${store.id}`}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </Field>
        <Field label="Region">
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
        <Field label="Ownership">
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
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          data-testid={`store-edit-save-${store.id}`}
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-[#F6F2E6] transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

/** List of stores with per-row inline edit. */
export function StoreList({ stores }: { stores: StoreRow[] }) {
  if (stores.length === 0) {
    return <p className="text-sm text-faint">No stores yet — add one below.</p>;
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
