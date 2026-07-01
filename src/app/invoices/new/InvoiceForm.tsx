"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { computeLine, computeInvoiceTotal, type Channel, type LineResult } from "@/lib/billing";
import { pkr, kg, pct } from "@/lib/format";
import { createInvoice } from "../actions";

export interface FormItem {
  id: string;
  name: string;
  isPrawn: boolean;
  fixedRate: number | null;
  packetsPerCarton: number;
  expectedGlazingPct: number | null;
}
export interface FormParty {
  id: string;
  name: string;
  channel: string | null;
  subType: string | null;
}
export interface FormStore {
  id: string;
  name: string;
}

interface LineRow {
  itemId: string;
  grossWeightKg: string;
  finalWeightKg: string;
  glazingPercent: string;
  ratePerKg: string;
  cartonCount: string;
  packetCount: string;
  expectedPacketCount: string;
}

const emptyLine: LineRow = {
  itemId: "",
  grossWeightKg: "",
  finalWeightKg: "",
  glazingPercent: "",
  ratePerKg: "",
  cartonCount: "",
  packetCount: "",
  expectedPacketCount: "",
};

export default function InvoiceForm({
  parties,
  items,
  stores,
  regions,
}: {
  parties: FormParty[];
  items: FormItem[];
  stores: FormStore[];
  regions: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [partyId, setPartyId] = useState("");
  const [channel, setChannel] = useState<Channel>("north");
  const [sourceStoreId, setSourceStoreId] = useState("");
  const [referenceRegion, setReferenceRegion] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<LineRow[]>([{ ...emptyLine }]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ invoiceNumber: number; referenceNumber: string | null; total: number } | null>(null);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  function updateRow(i: number, patch: Partial<LineRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function pickItem(i: number, itemId: string) {
    const item = itemById.get(itemId);
    updateRow(i, {
      itemId,
      ratePerKg: item?.fixedRate != null ? String(item.fixedRate) : "",
    });
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

  const total = computeInvoiceTotal(
    computed.filter((c) => c.result).map((c) => c.result!),
  );

  const canSubmit =
    partyId &&
    rows.length > 0 &&
    computed.every((c) => c.result) &&
    !isPending;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await createInvoice({
          partyId,
          channel,
          sourceStoreId: sourceStoreId || undefined,
          referenceRegion: referenceRegion || undefined,
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
        setDone(res);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950">
        <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
          ✓ Invoice #{done.invoiceNumber} saved
        </h2>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
          {done.referenceNumber ? `Reference ${done.referenceNumber} · ` : ""}
          Total {pkr(done.total)}. An immutable delivery record was created for dispute defense.
        </p>
        <div className="mt-4 flex gap-3 text-sm">
          <a href={`/parties/${partyId}`} className="text-cyan-700 underline dark:text-cyan-400">
            View party ledger →
          </a>
          <button
            onClick={() => {
              setDone(null);
              setRows([{ ...emptyLine }]);
            }}
            className="text-slate-600 underline dark:text-slate-300"
          >
            New another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header fields */}
      <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
        <Field label="Party">
          <select
            className="input"
            data-testid="party"
            value={partyId}
            onChange={(e) => {
              const p = parties.find((x) => x.id === e.target.value);
              setPartyId(e.target.value);
              if (p?.channel === "north" || p?.channel === "local") setChannel(p.channel);
            }}
          >
            <option value="">Select party…</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.subType ? `(${p.subType})` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Channel">
          <div className="flex gap-2">
            {(["north", "local"] as Channel[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
                  channel === c
                    ? "border-cyan-600 bg-cyan-50 text-cyan-800 dark:border-cyan-500 dark:bg-cyan-950 dark:text-cyan-300"
                    : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                {c === "north" ? "North (frozen)" : "Local (fresh)"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Source store">
          <select className="input" value={sourceStoreId} onChange={(e) => setSourceStoreId(e.target.value)}>
            <option value="">—</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Reference series (book/region)">
          <select className="input" value={referenceRegion} onChange={(e) => setReferenceRegion(e.target.value)}>
            <option value="">None</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
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
                  <select className="input" data-testid={`item-${i}`} value={r.itemId} onChange={(e) => pickItem(i, e.target.value)}>
                    <option value="">Select…</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>{it.name}{it.isPrawn ? " 🦐" : ""}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Gross weight (kg)">
                  <input className="input" data-testid={`gross-${i}`} inputMode="decimal" value={r.grossWeightKg}
                    onChange={(e) => updateRow(i, { grossWeightKg: e.target.value })} />
                </Field>
                {channel === "north" ? (
                  <Field label="Final/net weight (kg)" hint="buyer's defrosted weight">
                    <input className="input" data-testid={`final-${i}`} inputMode="decimal" value={r.finalWeightKg}
                      onChange={(e) => updateRow(i, { finalWeightKg: e.target.value })} />
                  </Field>
                ) : (
                  <Field label="Glazing %" hint="local = 0 (ignored)">
                    <input className="input" inputMode="decimal" value={r.glazingPercent} disabled
                      placeholder="0" />
                  </Field>
                )}
                <Field label="Rate / kg (net)">
                  <input className="input" data-testid={`rate-${i}`} inputMode="decimal" value={r.ratePerKg}
                    onChange={(e) => updateRow(i, { ratePerKg: e.target.value })} />
                </Field>
                <Field label="Cartons">
                  <input className="input" data-testid={`cartons-${i}`} inputMode="numeric" value={r.cartonCount}
                    onChange={(e) => updateRow(i, { cartonCount: e.target.value })} />
                </Field>
                <Field label="Packets">
                  <input className="input" data-testid={`packets-${i}`} inputMode="numeric" value={r.packetCount}
                    onChange={(e) => updateRow(i, { packetCount: e.target.value })} />
                </Field>
                <Field label="Expected packets" hint="for short-count alert">
                  <input className="input" data-testid={`expected-${i}`} inputMode="numeric" value={r.expectedPacketCount}
                    onChange={(e) => updateRow(i, { expectedPacketCount: e.target.value })}
                    placeholder={item ? String((Number(r.cartonCount) || 0) * item.packetsPerCarton || "") : ""} />
                </Field>
              </div>

              {/* Live results from the shared engine */}
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                {c?.error && <span className="text-amber-600 dark:text-amber-400">⚠ {c.error}</span>}
                {c?.result && (
                  <>
                    <span className="text-slate-500 dark:text-slate-400">Net: <strong className="text-slate-800 dark:text-slate-100">{kg(c.result.netWeightKg)}</strong></span>
                    <span className="text-slate-500 dark:text-slate-400">Glazing: <strong className="text-slate-800 dark:text-slate-100">{pct(c.result.glazingPercent)}</strong></span>
                    <span className="text-slate-500 dark:text-slate-400">Amount: <strong className="text-slate-800 dark:text-slate-100">{pkr(c.result.amount)}</strong></span>
                    {c.result.varianceAlert && (
                      <span className="rounded bg-red-50 px-2 py-0.5 text-red-700 dark:bg-red-950 dark:text-red-300">
                        ⚠ Over-deduction: {pct(c.result.varianceAlert.actualPercent)} vs expected {pct(c.result.varianceAlert.expectedPercent)} (+{pct(c.result.varianceAlert.exceededByPercent)})
                      </span>
                    )}
                    {c.result.packetShortAlert && (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        ⚠ Short {c.result.packetShortAlert.shortBy} packet(s): {c.result.packetShortAlert.actual}/{c.result.packetShortAlert.expected}
                      </span>
                    )}
                  </>
                )}
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                    className="ml-auto text-xs text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400">Remove line</button>
                )}
              </div>
            </div>
          );
        })}
        <button type="button" onClick={() => setRows((rs) => [...rs, { ...emptyLine }])}
          className="text-sm text-cyan-700 hover:underline dark:text-cyan-400">+ Add line</button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <input className="input max-w-xs" placeholder="Notes (optional)" value={notes}
          onChange={(e) => setNotes(e.target.value)} />
        <div className="text-right">
          <div className="text-xs uppercase text-slate-400 dark:text-slate-500">Invoice total</div>
          <div className="text-xl font-semibold">{pkr(total)}</div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button onClick={submit} disabled={!canSubmit}
        className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-40">
        {isPending ? "Saving…" : "Save invoice + delivery record"}
      </button>
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
