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
import { useCopy } from "@/lib/copy/CopyProvider";

export interface PartyRow {
  id: string;
  name: string;
  partyType: string;
  subType: string | null;
  channel: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  ntn: string | null;
  openingBalance: number;
}

interface PartyValues {
  name: string;
  partyType: string;
  subType: string;
  channel: string;
  address: string;
  phone: string;
  email: string;
  contactPerson: string;
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
    phone: v.phone.trim() || undefined,
    email: v.email.trim() || undefined,
    contactPerson: v.contactPerson.trim() || undefined,
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
  const t = useCopy();
  const isCustomer = v.partyType === "customer";
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label={t("settings.parties.field.name")}>
        <input
          className="input"
          data-testid={`${idPrefix}-name`}
          value={v.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Field label={t("settings.parties.field.type")}>
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
        label={t("settings.parties.field.subType")}
        hint={
          isCustomer
            ? t("settings.parties.field.subTypeHintCustomer")
            : t("settings.parties.field.subTypeHintSupplier")
        }
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
      <Field label={t("settings.parties.field.channel")} hint={t("settings.parties.field.channelHint")}>
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
      <Field label={t("settings.parties.field.ntn")} hint={t("settings.parties.field.ntnHint")}>
        <input
          className="input"
          data-testid={`${idPrefix}-ntn`}
          value={v.ntn}
          onChange={(e) => set({ ntn: e.target.value })}
        />
      </Field>
      <Field label={t("settings.parties.field.opening")} hint={t("settings.parties.field.openingHint")}>
        <input
          className="input"
          data-testid={`${idPrefix}-opening`}
          inputMode="decimal"
          value={v.openingBalance}
          onChange={(e) => set({ openingBalance: e.target.value })}
        />
      </Field>
      <Field label={t("settings.parties.field.contactPerson")}>
        <input
          className="input"
          data-testid={`${idPrefix}-contact-person`}
          value={v.contactPerson}
          onChange={(e) => set({ contactPerson: e.target.value })}
        />
      </Field>
      <Field label={t("settings.parties.field.phone")}>
        <input
          className="input"
          data-testid={`${idPrefix}-phone`}
          value={v.phone}
          onChange={(e) => set({ phone: e.target.value })}
        />
      </Field>
      <Field label={t("settings.parties.field.email")}>
        <input
          className="input"
          type="text"
          data-testid={`${idPrefix}-email`}
          value={v.email}
          onChange={(e) => set({ email: e.target.value })}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label={t("settings.parties.field.address")} hint={t("settings.parties.field.addressHint")}>
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
  phone: "",
  email: "",
  contactPerson: "",
  ntn: "",
  openingBalance: "",
};

/** Add a new party (customer or supplier). */
export function AddPartyForm() {
  const t = useCopy();
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
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? t("settings.parties.add.adding") : t("settings.parties.add.submit")}
        </button>
        {ok && <span className="text-xs font-medium text-pos">{t("settings.parties.saved")}</span>}
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

/** Inline edit form for a party. */
function EditPartyForm({ party, onDone }: { party: PartyRow; onDone: () => void }) {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [v, setV] = useState<PartyValues>({
    name: party.name,
    partyType: party.partyType,
    subType: party.subType ?? "",
    channel: party.channel ?? "",
    address: party.address ?? "",
    phone: party.phone ?? "",
    email: party.email ?? "",
    contactPerson: party.contactPerson ?? "",
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
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? t("settings.parties.edit.saving") : t("settings.parties.edit.save")}
        </button>
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

/** Grouped list (customers / suppliers) with inline edit per row. */
export function PartyList({ title, parties }: { title: string; parties: PartyRow[] }) {
  const t = useCopy();
  return (
    <div>
      <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
        {title} ({parties.length})
      </h3>
      {parties.length === 0 ? (
        <p className="text-sm text-faint">{t("settings.parties.empty")}</p>
      ) : (
        <ul className="divide-y divide-row">
          {parties.map((p) => (
            <li key={p.id} data-testid={`party-row-${p.id}`}>
              <EditToggle
                testId={`party-${p.id}`}
                summary={
                  <div>
                    <div className="font-medium text-ink">{p.name}</div>
                    <div className="text-xs text-faint">
                      {[
                        p.subType,
                        p.channel,
                        p.ntn ? `${t("settings.parties.row.ntnPrefix")} ${p.ntn}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                      {p.openingBalance
                        ? ` · ${t("settings.parties.row.openingPrefix")} ${pkr(p.openingBalance)}`
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
