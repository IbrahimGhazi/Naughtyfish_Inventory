"use client";

import { useMemo, useState } from "react";
import { pkr } from "@/lib/format";
import { computeLine, computeInvoiceTotal } from "@/lib/billing";
import { enqueue, flush } from "@/lib/offline/client";
import type { CachedItem, CachedStore } from "@/lib/offline/types";
import type { CreateInvoiceInput } from "@/app/invoices/actions";

type Channel = "north" | "local";

interface DraftLine {
  key: number;
  itemId: string;
  grossWeightKg: string;
  ratePerKg: string;
  glazingPercent: string;
  cartonCount: string;
  packetCount: string;
}

const emptyLine = (key: number): DraftLine => ({
  key,
  itemId: "",
  grossWeightKg: "",
  ratePerKg: "",
  glazingPercent: "",
  cartonCount: "",
  packetCount: "",
});

const num = (s: string): number | undefined => {
  const n = Number(s);
  return s.trim() !== "" && Number.isFinite(n) ? n : undefined;
};

/**
 * Offline invoice entry. Captures the SAME raw inputs the online form sends;
 * the server recomputes every total, deducts stock, and assigns the invoice
 * number at sync time. The live total here uses the shared billing engine, so
 * it matches what the server will produce.
 */
export default function InvoiceForm({
  partyId,
  partyName,
  entityId,
  items,
  stores,
  defaultChannel,
  onDone,
  onCancel,
}: {
  partyId: string;
  partyName: string;
  entityId: string;
  items: CachedItem[];
  stores: CachedStore[];
  defaultChannel: Channel;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [sourceStoreId, setSourceStoreId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(0)]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nextKey = useState(() => ({ n: 1 }))[0];

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const setLine = (key: number, patch: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, emptyLine(nextKey.n++)]);
  const removeLine = (key: number) =>
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));

  // Live total via the shared engine (only fully-entered lines contribute).
  const total = useMemo(() => {
    const computed = lines
      .map((l) => {
        const gross = num(l.grossWeightKg);
        const rate = num(l.ratePerKg);
        if (!l.itemId || gross === undefined || gross <= 0 || rate === undefined) return null;
        return computeLine({
          grossWeightKg: gross,
          ratePerKg: rate,
          channel,
          glazingPercent: num(l.glazingPercent),
          isPrawn: itemById.get(l.itemId)?.isPrawn,
          cartonCount: num(l.cartonCount),
          packetCount: num(l.packetCount),
        });
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    return computeInvoiceTotal(computed);
  }, [lines, channel, itemById]);

  const submit = async () => {
    setError(null);
    const payloadLines: CreateInvoiceInput["lines"] = [];
    for (const l of lines) {
      const gross = num(l.grossWeightKg);
      const rate = num(l.ratePerKg);
      if (!l.itemId) continue; // skip blank rows
      if (gross === undefined || gross <= 0) return setError("Every line needs a gross weight (kg).");
      if (rate === undefined || rate < 0) return setError("Every line needs a rate.");
      payloadLines.push({
        itemId: l.itemId,
        grossWeightKg: gross,
        ratePerKg: rate,
        glazingPercent: num(l.glazingPercent),
        cartonCount: num(l.cartonCount),
        packetCount: num(l.packetCount),
      });
    }
    if (payloadLines.length === 0) return setError("Add at least one line with an item.");

    setSaving(true);
    try {
      const payload: CreateInvoiceInput = {
        partyId,
        channel,
        sourceStoreId: sourceStoreId || undefined,
        notes: notes.trim() || undefined,
        lines: payloadLines,
      };
      await enqueue("invoice", payload, {
        entityId,
        partyId,
        partyName,
        summary: `Invoice · ${pkr(total)}`,
      });
      void flush();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the invoice.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-hair bg-card p-4">
      <div className="text-[13px] font-semibold text-ink">New invoice</div>

      <div className="flex flex-wrap gap-2">
        {(["local", "north"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChannel(c)}
            className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
              channel === c ? "border-accent text-on-accent" : "border-hair bg-card text-muted hover:bg-card2"
            }`}
            style={channel === c ? { background: "var(--accent)" } : undefined}
          >
            {c}
          </button>
        ))}
        {stores.length > 0 && (
          <select
            value={sourceStoreId}
            onChange={(e) => setSourceStoreId(e.target.value)}
            className="input"
          >
            <option value="">No source store</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                From {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-3">
        {lines.map((l, idx) => (
          <div key={l.key} className="rounded-lg border border-hair2 bg-card2 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
                Line {idx + 1}
              </span>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(l.key)}
                  className="text-[12px] font-semibold text-neg hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <select
              value={l.itemId}
              onChange={(e) => setLine(l.key, { itemId: e.target.value })}
              className="input mb-2 w-full"
            >
              <option value="">Select item…</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <LineField label="Gross kg" value={l.grossWeightKg} onChange={(v) => setLine(l.key, { grossWeightKg: v })} />
              <LineField label="Rate/kg" value={l.ratePerKg} onChange={(v) => setLine(l.key, { ratePerKg: v })} />
              <LineField
                label="Glaze %"
                value={l.glazingPercent}
                onChange={(v) => setLine(l.key, { glazingPercent: v })}
              />
              <LineField label="Cartons" value={l.cartonCount} onChange={(v) => setLine(l.key, { cartonCount: v })} />
              <LineField label="Packets" value={l.packetCount} onChange={(v) => setLine(l.key, { packetCount: v })} />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addLine}
          className="rounded-lg border border-dashed border-hair px-3 py-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:bg-card2"
        >
          + Add line
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">Notes (optional)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input w-full" placeholder="optional" />
      </label>

      <div className="flex items-center justify-between border-t border-hair2 pt-2.5">
        <span className="text-[12px] text-muted">Estimated total</span>
        <span className="font-mono text-[15px] font-semibold text-ink">{pkr(total)}</span>
      </div>

      {error && <p className="text-[12.5px] text-neg">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save invoice"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-card2"
        >
          Cancel
        </button>
      </div>
      <p className="text-[11.5px] text-faint">
        The invoice number is assigned by the office system when this syncs — it shows as “pending” until then.
      </p>
    </div>
  );
}

function LineField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.06em] text-faint2">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="input w-full disabled:opacity-40"
        placeholder="0"
      />
    </label>
  );
}
