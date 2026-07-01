"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { computeLine, computeInvoiceTotal, type Channel, type LineResult } from "@/lib/billing";
import { pkr, kg, pct } from "@/lib/format";
import { updateInvoice } from "../../actions";

export interface EditFormItem {
  id: string;
  name: string;
  isPrawn: boolean;
  packetsPerCarton: number;
  expectedGlazingPct: number | null;
}

/** Prefilled line values (Decimals already cast to numbers -> strings). */
export interface EditLineRow {
  itemId: string;
  grossWeightKg: string;
  finalWeightKg: string;
  glazingPercent: string;
  ratePerKg: string;
  cartonCount: string;
  packetCount: string;
  expectedPacketCount: string;
}

const emptyLine: EditLineRow = {
  itemId: "",
  grossWeightKg: "",
  finalWeightKg: "",
  glazingPercent: "",
  ratePerKg: "",
  cartonCount: "",
  packetCount: "",
  expectedPacketCount: "",
};

export default function EditInvoiceForm({
  invoiceId,
  invoiceNumber,
  partyName,
  channel,
  items,
  initialLines,
  initialNotes,
}: {
  invoiceId: string;
  invoiceNumber: number;
  partyName: string;
  channel: Channel;
  items: EditFormItem[];
  initialLines: EditLineRow[];
  initialNotes: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(initialNotes);
  const [rows, setRows] = useState<EditLineRow[]>(
    initialLines.length ? initialLines : [{ ...emptyLine }],
  );
  const [error, setError] = useState<string | null>(null);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  function updateRow(i: number, patch: Partial<EditLineRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function pickItem(i: number, itemId: string) {
    updateRow(i, { itemId });
  }

  // Live per-line computation via the SHARED engine (same code the server runs).
  const computed = rows.map((r): { result?: LineResult; error?: string } => {
    const item = itemById.get(r.itemId);
    const gross = parseFloat(r.grossWeightKg);
    const rate = parseFloat(r.ratePerKg);
    if (!item || !r.grossWeightKg || !r.ratePerKg || Number.isNaN(gross) || Number.isNaN(rate)) {
      return {};
    }
    try {
      const result = computeLine({
        grossWeightKg: gross,
        ratePerKg: rate,
        channel,
        finalWeightKg: r.finalWeightKg ? parseFloat(r.finalWeightKg) : undefined,
        glazingPercent: r.glazingPercent ? parseFloat(r.glazingPercent) : undefined,
        isPrawn: item.isPrawn,
        cartonCount: r.cartonCount ? parseInt(r.cartonCount) : undefined,
        packetCount: r.packetCount ? parseInt(r.packetCount) : undefined,
        expectedPacketCount: r.expectedPacketCount ? parseInt(r.expectedPacketCount) : undefined,
        expectedGlazingPercent: item.expectedGlazingPct ?? undefined,
      });
      return { result };
    } catch (e) {
      return { error: (e as Error).message };
    }
  });

  const total = computeInvoiceTotal(computed.filter((c) => c.result).map((c) => c.result!));

  const canSubmit = rows.length > 0 && computed.every((c) => c.result) && !isPending;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await updateInvoice({
          invoiceId,
          notes: notes || undefined,
          lines: rows.map((r) => ({
            itemId: r.itemId,
            grossWeightKg: Number(r.grossWeightKg),
            finalWeightKg: r.finalWeightKg ? Number(r.finalWeightKg) : undefined,
            glazingPercent: r.glazingPercent ? Number(r.glazingPercent) : undefined,
            ratePerKg: Number(r.ratePerKg),
            cartonCount: r.cartonCount ? Number(r.cartonCount) : undefined,
            packetCount: r.packetCount ? Number(r.packetCount) : undefined,
            expectedPacketCount: r.expectedPacketCount ? Number(r.expectedPacketCount) : undefined,
          })),
        });
        router.push(`/invoices/${invoiceId}`);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Header — party + channel are FIXED on edit. */}
      <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
        <Field label="Party" hint="fixed on edit">
          <div className="input bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{partyName}</div>
        </Field>
        <Field label="Channel" hint="fixed on edit">
          <div className="input bg-slate-50 capitalize text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {channel === "north" ? "North (frozen)" : "Local (fresh)"}
          </div>
        </Field>
      </div>

      {/* Line items */}
      <div className="space-y-3">
        {rows.map((r, i) => {
          const c = computed[i];
          const item = itemById.get(r.itemId);
          return (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Item">
                  <select
                    className="input"
                    data-testid={`edit-item-${i}`}
                    value={r.itemId}
                    onChange={(e) => pickItem(i, e.target.value)}
                  >
                    <option value="">Select…</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                        {it.isPrawn ? " 🦐" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Gross weight (kg)">
                  <input
                    className="input"
                    data-testid={`edit-gross-${i}`}
                    inputMode="decimal"
                    value={r.grossWeightKg}
                    onChange={(e) => updateRow(i, { grossWeightKg: e.target.value })}
                  />
                </Field>
                {channel === "north" ? (
                  <Field label="Final/net weight (kg)" hint="buyer's defrosted weight">
                    <input
                      className="input"
                      data-testid={`edit-final-${i}`}
                      inputMode="decimal"
                      value={r.finalWeightKg}
                      onChange={(e) => updateRow(i, { finalWeightKg: e.target.value })}
                    />
                  </Field>
                ) : (
                  <Field label="Glazing %" hint="local = 0 (ignored)">
                    <input
                      className="input"
                      data-testid={`edit-glazing-${i}`}
                      inputMode="decimal"
                      value={r.glazingPercent}
                      disabled
                      placeholder="0"
                    />
                  </Field>
                )}
                <Field label="Rate / kg (net)">
                  <input
                    className="input"
                    data-testid={`edit-rate-${i}`}
                    inputMode="decimal"
                    value={r.ratePerKg}
                    onChange={(e) => updateRow(i, { ratePerKg: e.target.value })}
                  />
                </Field>
                <Field label="Cartons">
                  <input
                    className="input"
                    data-testid={`edit-cartons-${i}`}
                    inputMode="numeric"
                    value={r.cartonCount}
                    onChange={(e) => updateRow(i, { cartonCount: e.target.value })}
                  />
                </Field>
                <Field label="Packets">
                  <input
                    className="input"
                    data-testid={`edit-packets-${i}`}
                    inputMode="numeric"
                    value={r.packetCount}
                    onChange={(e) => updateRow(i, { packetCount: e.target.value })}
                  />
                </Field>
                <Field label="Expected packets" hint="for short-count alert">
                  <input
                    className="input"
                    data-testid={`edit-expected-${i}`}
                    inputMode="numeric"
                    value={r.expectedPacketCount}
                    onChange={(e) => updateRow(i, { expectedPacketCount: e.target.value })}
                    placeholder={item ? String((Number(r.cartonCount) || 0) * item.packetsPerCarton || "") : ""}
                  />
                </Field>
              </div>

              {/* Live results from the shared engine */}
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                {c?.error && <span className="text-amber-600 dark:text-amber-400">⚠ {c.error}</span>}
                {c?.result && (
                  <>
                    <span className="text-slate-500 dark:text-slate-400">
                      Net: <strong className="text-slate-800 dark:text-slate-100">{kg(c.result.netWeightKg)}</strong>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Glazing: <strong className="text-slate-800 dark:text-slate-100">{pct(c.result.glazingPercent)}</strong>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Amount: <strong className="text-slate-800 dark:text-slate-100">{pkr(c.result.amount)}</strong>
                    </span>
                    {c.result.varianceAlert && (
                      <span className="rounded bg-red-50 px-2 py-0.5 text-red-700 dark:bg-red-950 dark:text-red-300">
                        ⚠ Over-deduction: {pct(c.result.varianceAlert.actualPercent)} vs expected{" "}
                        {pct(c.result.varianceAlert.expectedPercent)} (+
                        {pct(c.result.varianceAlert.exceededByPercent)})
                      </span>
                    )}
                    {c.result.packetShortAlert && (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        ⚠ Short {c.result.packetShortAlert.shortBy} packet(s):{" "}
                        {c.result.packetShortAlert.actual}/{c.result.packetShortAlert.expected}
                      </span>
                    )}
                  </>
                )}
                {rows.length > 1 && (
                  <button
                    type="button"
                    data-testid={`edit-remove-${i}`}
                    onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                    className="ml-auto text-xs text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
                  >
                    Remove line
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          data-testid="edit-add-line"
          onClick={() => setRows((rs) => [...rs, { ...emptyLine }])}
          className="text-sm text-cyan-700 hover:underline dark:text-cyan-400"
        >
          + Add line
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <input
          className="input max-w-xs"
          data-testid="edit-notes"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="text-right">
          <div className="text-xs uppercase text-slate-400 dark:text-slate-500">Invoice total</div>
          <div className="text-xl font-semibold">{pkr(total)}</div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={!canSubmit}
          data-testid="edit-save"
          className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-40"
        >
          {isPending ? "Saving…" : `Save changes to #${invoiceNumber}`}
        </button>
        <a href={`/invoices/${invoiceId}`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          Cancel
        </a>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        The invoice number stays the same. A new versioned delivery record is appended for dispute
        defense — the previous record is preserved, never overwritten.
      </p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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
