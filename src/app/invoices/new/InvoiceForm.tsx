"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { computeLine, computeInvoiceTotal, type Channel, type LineResult } from "@/lib/billing";
import { pkr, kg, pct } from "@/lib/format";
import { Card, Chip } from "@/components/ui";
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
      <Card
        className="animate-pop p-6"
        style={{ borderColor: "var(--pos)", background: "var(--pos-bg)" }}
      >
        <h2 className="font-serif text-lg font-semibold text-pos">
          ✓ Invoice #{done.invoiceNumber} saved
        </h2>
        <p className="mt-1 text-sm text-text">
          {done.referenceNumber ? `Reference ${done.referenceNumber} · ` : ""}
          Total <span className="font-mono">{pkr(done.total)}</span>. An immutable
          delivery record was created for dispute defense.
        </p>
        <div className="mt-4 flex gap-4 text-sm">
          <a href={`/parties/${partyId}`} className="font-semibold text-accent-deep underline">
            View party ledger →
          </a>
          <button
            onClick={() => {
              setDone(null);
              setRows([{ ...emptyLine }]);
            }}
            className="font-semibold text-muted underline"
          >
            New another
          </button>
        </div>
      </Card>
    );
  }

  const netWeightTotal = computed.reduce(
    (s, c) => s + (c.result ? c.result.netWeightKg : 0),
    0,
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3.5">
        {/* Party / channel / reference header card */}
        <Card className="p-[18px]">
          <div className="grid gap-3 sm:grid-cols-2">
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
                    className="rounded-lg border px-3 py-1.5 text-sm font-semibold capitalize transition-colors"
                    style={
                      channel === c
                        ? {
                            borderColor: "var(--accent)",
                            background: "var(--accent-tint)",
                            color: "var(--accent-deep)",
                          }
                        : undefined
                    }
                  >
                    {c === "north" ? "North (frozen)" : "Local (fresh)"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Reference series (book/region)">
              <select className="input" value={referenceRegion} onChange={(e) => setReferenceRegion(e.target.value)}>
                <option value="">None</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Notes" hint="optional">
              <input className="input" placeholder="Notes (optional)" value={notes}
                onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* Line-items table */}
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1fr_76px_92px_84px_88px_90px_100px_30px] items-center gap-2 border-b border-hair2 bg-card2 px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-faint2">
            <span>Item</span>
            <span>Cartons</span>
            <span>Gross kg</span>
            <span>{channel === "north" ? "Net kg in" : "Glaz %"}</span>
            <span>Rate</span>
            <span className="text-right">Net kg</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          <div>
            {rows.map((r, i) => {
              const c = computed[i];
              const item = itemById.get(r.itemId);
              return (
                <div key={i} className="animate-pop border-b border-row px-3.5 py-2.5">
                  <div className="grid grid-cols-[1fr_76px_92px_84px_88px_90px_100px_30px] items-center gap-2">
                    <select className="input !py-1.5 text-[13px]" data-testid={`item-${i}`} value={r.itemId} onChange={(e) => pickItem(i, e.target.value)}>
                      <option value="">Select…</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>{it.name}{it.isPrawn ? " 🦐" : ""}</option>
                      ))}
                    </select>
                    <input className="input !py-1.5 font-mono text-[13px]" data-testid={`cartons-${i}`} inputMode="numeric" value={r.cartonCount}
                      onChange={(e) => updateRow(i, { cartonCount: e.target.value })} />
                    <input className="input !py-1.5 font-mono text-[13px]" data-testid={`gross-${i}`} inputMode="decimal" value={r.grossWeightKg}
                      onChange={(e) => updateRow(i, { grossWeightKg: e.target.value })} />
                    {channel === "north" ? (
                      <input className="input !py-1.5 font-mono text-[13px]" data-testid={`final-${i}`} inputMode="decimal" value={r.finalWeightKg}
                        onChange={(e) => updateRow(i, { finalWeightKg: e.target.value })} placeholder="net kg" />
                    ) : (
                      <input className="input !py-1.5 font-mono text-[13px]" inputMode="decimal" value={r.glazingPercent} disabled placeholder="0" />
                    )}
                    <input className="input !py-1.5 font-mono text-[13px]" data-testid={`rate-${i}`} inputMode="decimal" value={r.ratePerKg}
                      onChange={(e) => updateRow(i, { ratePerKg: e.target.value })} />
                    <span className="text-right font-mono text-[13px] text-text">
                      {c?.result ? kg(c.result.netWeightKg) : "—"}
                    </span>
                    <span className="text-right font-mono text-[13px] font-semibold text-ink">
                      {c?.result ? pkr(c.result.amount) : "—"}
                    </span>
                    {rows.length > 1 ? (
                      <button type="button" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                        title="Remove line"
                        className="justify-self-center text-[15px] text-faint2 hover:text-neg">×</button>
                    ) : (
                      <span />
                    )}
                  </div>

                  {/* Live packets + alerts */}
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Field label="Packets">
                      <input className="input !py-1.5 font-mono text-[13px]" data-testid={`packets-${i}`} inputMode="numeric" value={r.packetCount}
                        onChange={(e) => updateRow(i, { packetCount: e.target.value })} />
                    </Field>
                    <Field label="Expected packets" hint="short-count alert">
                      <input className="input !py-1.5 font-mono text-[13px]" data-testid={`expected-${i}`} inputMode="numeric" value={r.expectedPacketCount}
                        onChange={(e) => updateRow(i, { expectedPacketCount: e.target.value })}
                        placeholder={item ? String((Number(r.cartonCount) || 0) * item.packetsPerCarton || "") : ""} />
                    </Field>
                    <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] self-end sm:col-span-2">
                      {c?.error && <span className="text-warn">⚠ {c.error}</span>}
                      {c?.result && (
                        <>
                          <span className="text-muted">Glazing: <strong className="font-mono text-text">{pct(c.result.glazingPercent)}</strong></span>
                          {c.result.varianceAlert && (
                            <Chip tone="neg">
                              ⚠ Over-deduction {pct(c.result.varianceAlert.actualPercent)} vs {pct(c.result.varianceAlert.expectedPercent)} (+{pct(c.result.varianceAlert.exceededByPercent)})
                            </Chip>
                          )}
                          {c.result.packetShortAlert && (
                            <Chip tone="warn">
                              ⚠ Short {c.result.packetShortAlert.shortBy}: {c.result.packetShortAlert.actual}/{c.result.packetShortAlert.expected}
                            </Chip>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => setRows((rs) => [...rs, { ...emptyLine }])}
            className="block w-full px-3.5 py-3 text-left text-[13px] font-semibold text-accent transition-colors hover:bg-card2"
            style={{ background: "var(--card-2)" }}>
            + Add line
          </button>
        </Card>

        <div className="px-0.5 text-[12px] text-faint">
          Net weight and amounts recompute live — net = gross − glazing %, amount = net × rate.
        </div>

        {error && <p className="text-sm text-neg">{error}</p>}
      </div>

      {/* Summary panel (dark ink, sticky) */}
      <div
        className="sticky top-[84px] rounded-2xl p-5"
        style={{ background: "var(--side-bg)", color: "var(--side-fg)" }}
      >
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--side-dim)" }}>
          Summary
        </div>
        <div className="my-3.5 flex flex-col gap-2.5 text-[13px]">
          <div className="flex justify-between">
            <span style={{ color: "var(--side-dim)" }}>Reference</span>
            <span className="font-mono text-gold">{referenceRegion || "auto"}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--side-dim)" }}>Channel</span>
            <span className="font-semibold capitalize">{channel}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--side-dim)" }}>Lines</span>
            <span className="font-mono">{rows.length}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--side-dim)" }}>Net weight</span>
            <span className="font-mono">{kg(netWeightTotal)}</span>
          </div>
          <label className="mt-1 block">
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--side-dim)" }}>
              Source store
            </div>
            <select
              value={sourceStoreId}
              onChange={(e) => setSourceStoreId(e.target.value)}
              className="w-full rounded-lg px-2.5 py-2 text-[13px] outline-none"
              style={{
                background: "rgba(242,235,217,.08)",
                border: "1px solid rgba(242,235,217,.22)",
                color: "var(--side-fg)",
              }}
            >
              <option value="" style={{ color: "var(--ink)" }}>—</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id} style={{ color: "var(--ink)" }}>{s.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="border-t pt-3.5" style={{ borderColor: "rgba(242,235,217,.14)" }}>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--side-dim)" }}>
            Total
          </div>
          <div className="mt-1.5 font-mono text-[28px] font-semibold tracking-tight">
            {pkr(total)}
          </div>
        </div>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="mt-4 w-full rounded-[10px] py-3 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Saving…" : "Save invoice"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-faint2">
        {label}
        {hint && <span className="ml-1 font-normal normal-case tracking-normal text-faint">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}
