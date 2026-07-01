"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createParty, updateParty } from "../actions";
import { Field, EditToggle } from "../ui";
import {
  PARTY_TYPES,
  PARTY_SUBTYPES,
  CHANNELS,
  type PartyType,
  type PartySubType,
  type Channel,
} from "@/lib/enums";
import { pkr } from "@/lib/format";

export interface PartyRow {
  id: string;
  name: string;
  partyType: string;
  subType: string | null;
  channel: string | null;
  address: string | null;
  ntn: string | null;
  openingBalance: number;
}

interface PartyValues {
  name: string;
  partyType: string;
  subType: string;
  channel: string;
  address: string;
  ntn: string;
  openingBalance: string;
}

function toPayload(v: PartyValues) {
  return {
    name: v.name.trim(),
    partyType: v.partyType as PartyType,
    subType: (v.subType || null) as PartySubType | null,
    channel: (v.channel || null) as Channel | null,
    address: v.address.trim() || undefined,
    ntn: v.ntn.trim() || undefined,
    openingBalance: v.openingBalance ? Number(v.openingBalance) : 0,
  };
}

/** Shared field grid used by both add and edit forms. */
function PartyFields({
  v,
  set,
  idPrefix,
}: {
  v: PartyValues;
  set: (patch: Partial<PartyValues>) => void;
  idPrefix: string;
}) {
  const isCustomer = v.partyType === "customer";
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Name">
        <input
          className="input"
          data-testid={`${idPrefix}-name`}
          value={v.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Field label="Type">
        <select
          className="input"
          data-testid={`${idPrefix}-type`}
          value={v.partyType}
          onChange={(e) =>
            set({
              partyType: e.target.value,
              // suppliers don't carry a customer subType
              subType: e.target.value === "customer" ? v.subType : "",
            })
          }
        >
          {PARTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Sub-type"
        hint={isCustomer ? "customers only" : "n/a for suppliers"}
      >
        <select
          className="input"
          data-testid={`${idPrefix}-subtype`}
          value={v.subType}
          disabled={!isCustomer}
          onChange={(e) => set({ subType: e.target.value })}
        >
          <option value="">—</option>
          {PARTY_SUBTYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Channel" hint="optional">
        <select
          className="input"
          data-testid={`${idPrefix}-channel`}
          value={v.channel}
          onChange={(e) => set({ channel: e.target.value })}
        >
          <option value="">—</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="NTN" hint="local buyers are name-only — leave blank">
        <input
          className="input"
          data-testid={`${idPrefix}-ntn`}
          value={v.ntn}
          onChange={(e) => set({ ntn: e.target.value })}
        />
      </Field>
      <Field label="Opening balance (PKR)" hint="optional">
        <input
          className="input"
          data-testid={`${idPrefix}-opening`}
          inputMode="decimal"
          value={v.openingBalance}
          onChange={(e) => set({ openingBalance: e.target.value })}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Address" hint="optional">
          <input
            className="input"
            data-testid={`${idPrefix}-address`}
            value={v.address}
            onChange={(e) => set({ address: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

const EMPTY: PartyValues = {
  name: "",
  partyType: "customer",
  subType: "",
  channel: "",
  address: "",
  ntn: "",
  openingBalance: "",
};

/** Add a new party (customer or supplier). */
export function AddPartyForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [v, setV] = useState<PartyValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const set = (patch: Partial<PartyValues>) => setV((prev) => ({ ...prev, ...patch }));
  const canSubmit = !!v.name.trim() && !isPending;

  function submit() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await createParty(toPayload(v));
        setV(EMPTY);
        setOk(true);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <PartyFields v={v} set={set} idPrefix="party-add" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          data-testid="party-add-submit"
          className="rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-40"
        >
          {isPending ? "Adding…" : "+ Add party"}
        </button>
        {ok && <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Saved.</span>}
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </div>
  );
}

/** Inline edit form for a party. */
function EditPartyForm({ party, onDone }: { party: PartyRow; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [v, setV] = useState<PartyValues>({
    name: party.name,
    partyType: party.partyType,
    subType: party.subType ?? "",
    channel: party.channel ?? "",
    address: party.address ?? "",
    ntn: party.ntn ?? "",
    openingBalance: String(party.openingBalance ?? ""),
  });
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<PartyValues>) => setV((prev) => ({ ...prev, ...patch }));
  const canSubmit = !!v.name.trim() && !isPending;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await updateParty({ id: party.id, ...toPayload(v) });
        router.refresh();
        onDone();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <PartyFields v={v} set={set} idPrefix={`party-edit-${party.id}`} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          data-testid={`party-edit-save-${party.id}`}
          className="rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-40"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </div>
  );
}

/** Grouped list (customers / suppliers) with inline edit per row. */
export function PartyList({ title, parties }: { title: string; parties: PartyRow[] }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {title} ({parties.length})
      </h3>
      {parties.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">None yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {parties.map((p) => (
            <li key={p.id} data-testid={`party-row-${p.id}`}>
              <EditToggle
                testId={`party-${p.id}`}
                summary={
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {[p.subType, p.channel, p.ntn ? `NTN ${p.ntn}` : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                      {p.openingBalance
                        ? ` · opening ${pkr(p.openingBalance)}`
                        : ""}
                    </div>
                  </div>
                }
              >
                {(close) => <EditPartyForm party={p} onDone={close} />}
              </EditToggle>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
