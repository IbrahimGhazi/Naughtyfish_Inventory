"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createItem, updateItem, setItemActive } from "../actions";
import { Field, EditToggle } from "../ui";
import { Chip } from "@/components/ui";
import { ITEM_CATEGORIES, type ItemCategory } from "@/lib/enums";
import { pkr, pct } from "@/lib/format";
import { useCopy } from "@/lib/copy/CopyProvider";

export interface ItemRow {
  id: string;
  name: string;
  category: string;
  cartonWeightKg: number;
  packetsPerCarton: number;
  isPrawn: boolean;
  fixedRate: number | null;
  defaultGlazingPct: number | null;
  active: boolean;
}

interface ItemValues {
  name: string;
  category: string;
  cartonWeightKg: string;
  packetsPerCarton: string;
  isPrawn: boolean;
  fixedRate: string;
  defaultGlazingPct: string;
  active: boolean;
}

function toPayload(v: ItemValues) {
  return {
    name: v.name.trim(),
    category: v.category as ItemCategory,
    cartonWeightKg: Number(v.cartonWeightKg),
    packetsPerCarton: Number(v.packetsPerCarton),
    isPrawn: v.isPrawn,
    fixedRate: v.fixedRate.trim() ? Number(v.fixedRate) : null,
    defaultGlazingPct: v.defaultGlazingPct.trim()
      ? Number(v.defaultGlazingPct)
      : null,
    active: v.active,
  };
}

function ItemFields({
  v,
  set,
  idPrefix,
}: {
  v: ItemValues;
  set: (patch: Partial<ItemValues>) => void;
  idPrefix: string;
}) {
  const t = useCopy();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Field label={t("settings.items.field.name")}>
        <input
          className="input"
          data-testid={`${idPrefix}-name`}
          value={v.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Field label={t("settings.items.field.category")}>
        <select
          className="input"
          data-testid={`${idPrefix}-category`}
          value={v.category}
          onChange={(e) =>
            set({
              category: e.target.value,
              // keep the prawn flag in step with the category by default
              isPrawn: e.target.value === "prawn",
            })
          }
        >
          {ITEM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("settings.items.field.cartonKg")}>
        <input
          className="input"
          data-testid={`${idPrefix}-cartonkg`}
          inputMode="decimal"
          value={v.cartonWeightKg}
          onChange={(e) => set({ cartonWeightKg: e.target.value })}
        />
      </Field>
      <Field label={t("settings.items.field.packets")}>
        <input
          className="input"
          data-testid={`${idPrefix}-packets`}
          inputMode="numeric"
          value={v.packetsPerCarton}
          onChange={(e) => set({ packetsPerCarton: e.target.value })}
        />
      </Field>
      <Field label={t("settings.items.field.rate")} hint={t("settings.items.field.rateHint")}>
        <input
          className="input"
          data-testid={`${idPrefix}-rate`}
          inputMode="decimal"
          value={v.fixedRate}
          onChange={(e) => set({ fixedRate: e.target.value })}
        />
      </Field>
      <Field label={t("settings.items.field.glazing")} hint={t("settings.items.field.glazingHint")}>
        <input
          className="input"
          data-testid={`${idPrefix}-glazing`}
          inputMode="decimal"
          value={v.defaultGlazingPct}
          onChange={(e) => set({ defaultGlazingPct: e.target.value })}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-3">
        <input
          type="checkbox"
          data-testid={`${idPrefix}-isprawn`}
          checked={v.isPrawn}
          onChange={(e) => set({ isPrawn: e.target.checked })}
          className="h-4 w-4 rounded border-hair2"
        />
        <span className="text-text">
          {t("settings.items.field.isPrawn")}
        </span>
      </label>
    </div>
  );
}

const EMPTY: ItemValues = {
  name: "",
  category: "fish_fillet",
  cartonWeightKg: "20",
  packetsPerCarton: "10",
  isPrawn: false,
  fixedRate: "",
  defaultGlazingPct: "",
  active: true,
};

/** Add a new item / product. */
export function AddItemForm() {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [v, setV] = useState<ItemValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const set = (patch: Partial<ItemValues>) => setV((prev) => ({ ...prev, ...patch }));
  const canSubmit =
    !!v.name.trim() &&
    Number(v.cartonWeightKg) > 0 &&
    Number(v.packetsPerCarton) > 0 &&
    !isPending;

  function submit() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await createItem(toPayload(v));
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
      <ItemFields v={v} set={set} idPrefix="item-add" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          data-testid="item-add-submit"
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? t("settings.items.add.adding") : t("settings.items.add.submit")}
        </button>
        {ok && <span className="text-xs font-medium text-pos">{t("settings.items.saved")}</span>}
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

function EditItemForm({ item, onDone }: { item: ItemRow; onDone: () => void }) {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [v, setV] = useState<ItemValues>({
    name: item.name,
    category: item.category,
    cartonWeightKg: String(item.cartonWeightKg),
    packetsPerCarton: String(item.packetsPerCarton),
    isPrawn: item.isPrawn,
    fixedRate: item.fixedRate != null ? String(item.fixedRate) : "",
    defaultGlazingPct:
      item.defaultGlazingPct != null ? String(item.defaultGlazingPct) : "",
    active: item.active,
  });
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<ItemValues>) => setV((prev) => ({ ...prev, ...patch }));
  const canSubmit =
    !!v.name.trim() &&
    Number(v.cartonWeightKg) > 0 &&
    Number(v.packetsPerCarton) > 0 &&
    !isPending;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await updateItem({ id: item.id, ...toPayload(v) });
        router.refresh();
        onDone();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <ItemFields v={v} set={set} idPrefix={`item-edit-${item.id}`} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          data-testid={`item-edit-save-${item.id}`}
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? t("settings.items.edit.saving") : t("settings.items.edit.save")}
        </button>
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

/** Active/inactive toggle button (soft-remove instead of delete). */
function ActiveToggle({ item }: { item: ItemRow }) {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setItemActive({ id: item.id, active: !item.active });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      data-testid={`item-toggle-${item.id}`}
      className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-card2 disabled:opacity-40 ${
        item.active ? "border-hair text-text" : "border-hair text-pos"
      }`}
    >
      {isPending
        ? "…"
        : item.active
          ? t("settings.items.toggle.deactivate")
          : t("settings.items.toggle.reactivate")}
    </button>
  );
}

export function ItemList({ items }: { items: ItemRow[] }) {
  const t = useCopy();
  if (items.length === 0) {
    return <p className="text-sm text-faint">{t("settings.items.empty")}</p>;
  }
  return (
    <ul className="divide-y divide-row">
      {items.map((it) => (
        <li key={it.id} data-testid={`item-row-${it.id}`}>
          <div className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{it.name}</span>
                  {!it.active && <Chip tone="warn">{t("settings.items.chip.inactive")}</Chip>}
                  {it.isPrawn && <Chip tone="info">{t("settings.items.chip.prawn")}</Chip>}
                </div>
                <div className="text-xs text-faint">
                  {it.category} · {it.cartonWeightKg} kg/carton ·{" "}
                  {it.packetsPerCarton} pkts
                  {it.fixedRate != null ? ` · rate ${pkr(it.fixedRate)}` : ""}
                  {it.defaultGlazingPct != null
                    ? ` · glaze ${pct(it.defaultGlazingPct)}`
                    : ""}
                </div>
              </div>
              <ActiveToggle item={it} />
            </div>
            <div className="mt-2">
              <EditToggle
                testId={`item-${it.id}`}
                summary={
                  <span className="text-xs text-faint">{t("settings.items.editDetails")}</span>
                }
              >
                {(close) => <EditItemForm item={it} onDone={close} />}
              </EditToggle>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
