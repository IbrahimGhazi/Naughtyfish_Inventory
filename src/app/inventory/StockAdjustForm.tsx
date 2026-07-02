"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustStock } from "./actions";

export interface AdjFormStore {
  id: string;
  name: string;
}
export interface AdjFormItem {
  id: string;
  name: string;
  isPrawn: boolean;
  cartonWeightKg: number;
}

export default function StockAdjustForm({
  stores,
  items,
}: {
  stores: AdjFormStore[];
  items: AdjFormItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [storeId, setStoreId] = useState("");
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<"receive" | "adjust">("receive");
  const [cartons, setCartons] = useState("");
  const [packets, setPackets] = useState("");
  const [kgPerCarton, setKgPerCarton] = useState("");
  const [totalKgOverride, setTotalKgOverride] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // Computed total = cartons × kgPerCarton, unless the user overrides it.
  const computedTotalKg = useMemo(() => {
    const c = parseFloat(cartons);
    const k = parseFloat(kgPerCarton);
    if (Number.isNaN(c) || Number.isNaN(k)) return null;
    return Math.round((c * k + Number.EPSILON) * 1000) / 1000;
  }, [cartons, kgPerCarton]);

  const effectiveTotalKg =
    totalKgOverride.trim() !== ""
      ? parseFloat(totalKgOverride)
      : computedTotalKg;

  function pickItem(id: string) {
    setItemId(id);
    const item = itemById.get(id);
    if (item && kgPerCarton.trim() === "") setKgPerCarton(String(item.cartonWeightKg));
  }

  const canSubmit =
    !!storeId &&
    !!itemId &&
    effectiveTotalKg !== null &&
    !Number.isNaN(effectiveTotalKg) &&
    !isPending;

  function submit() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await adjustStock({
          storeId,
          itemId,
          type,
          cartons: cartons ? Number(cartons) : 0,
          packets: packets ? Number(packets) : 0,
          kgPerCarton: kgPerCarton ? Number(kgPerCarton) : 0,
          totalKg: Number(effectiveTotalKg),
          note: note || undefined,
        });
        setCartons("");
        setPackets("");
        setTotalKgOverride("");
        setNote("");
        setOk(true);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Store">
          <select className="input" data-testid="adj-store" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="">Select store…</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Item">
          <select className="input" data-testid="adj-item" value={itemId} onChange={(e) => pickItem(e.target.value)}>
            <option value="">Select item…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}{i.isPrawn ? " 🦐" : ""}</option>
            ))}
          </select>
        </Field>
        <Field label="Movement type">
          <div className="flex gap-2">
            {(["receive", "adjust"] as const).map((t) => (
              <button
                key={t}
                type="button"
                data-testid={`adj-type-${t}`}
                onClick={() => setType(t)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold capitalize transition-colors ${
                  type === t
                    ? "border-transparent text-accent-deep"
                    : "border-hair text-muted hover:bg-card2"
                }`}
                style={type === t ? { background: "var(--accent-tint)" } : undefined}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Cartons">
          <input className="input" data-testid="adj-cartons" inputMode="numeric" value={cartons}
            onChange={(e) => setCartons(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Packets">
          <input className="input" data-testid="adj-packets" inputMode="numeric" value={packets}
            onChange={(e) => setPackets(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Kg / carton">
          <input className="input" data-testid="adj-kgpercarton" inputMode="decimal" value={kgPerCarton}
            onChange={(e) => setKgPerCarton(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Total kg" hint={computedTotalKg !== null && totalKgOverride.trim() === "" ? "computed" : "override"}>
          <input className="input" data-testid="adj-totalkg" inputMode="decimal" value={totalKgOverride}
            onChange={(e) => setTotalKgOverride(e.target.value)}
            placeholder={computedTotalKg !== null ? String(computedTotalKg) : "0"} />
        </Field>
        <Field label="Note">
          <input className="input" data-testid="adj-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={!canSubmit} data-testid="adj-submit"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}>
          {isPending ? "Saving…" : type === "receive" ? "Receive stock" : "Adjust stock"}
        </button>
        {effectiveTotalKg !== null && !Number.isNaN(effectiveTotalKg) && (
          <span className="text-xs text-faint">
            Will apply {effectiveTotalKg} kg to the store.
          </span>
        )}
        {ok && <span className="text-xs text-pos">✓ Saved.</span>}
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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
