"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { computeLine, computeInvoiceTotal, type Channel, type LineResult } from "@/lib/billing";
import { pkr, kg, pct } from "@/lib/format";
import { Card, Chip } from "@/components/ui";
import { useCopy } from "@/lib/copy/CopyProvider";
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
  const t = useCopy();
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

  const netWeightTotal = computed.reduce(
    (s, c) => s + (c.result ? c.result.netWeightKg : 0),
    0,
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3.5">
        {/* Header — party + channel are FIXED on edit. */}
        <Card className="p-[18px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("invoices.editForm.labelParty")} hint={t("invoices.editForm.hintFixed")}>
              <div className="input bg-card2 text-muted">{partyName}</div>
            </Field>
            <Field label={t("invoices.editForm.labelChannel")} hint={t("invoices.editForm.hintFixed")}>
              <div className="input bg-card2 capitalize text-muted">
                {channel === "north" ? t("invoices.editForm.channelNorth") : t("invoices.editForm.channelLocal")}
              </div>
            </Field>
          </div>
        </Card>

        {/* Line-items table */}
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1fr_76px_92px_84px_88px_90px_100px_30px] items-center gap-2 border-b border-hair2 bg-card2 px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-faint2">
            <span>{t("invoices.editForm.colItem")}</span>
            <span>{t("invoices.editForm.colCartons")}</span>
            <span>{t("invoices.editForm.colGross")}</span>
            <span>{channel === "north" ? t("invoices.editForm.colNetIn") : t("invoices.editForm.colGlaz")}</span>
            <span>{t("invoices.editForm.colRate")}</span>
            <span className="text-right">{t("invoices.editForm.colNet")}</span>
            <span className="text-right">{t("invoices.editForm.colAmount")}</span>
            <span />
          </div>
          <div>
            {rows.map((r, i) => {
              const c = computed[i];
              const item = itemById.get(r.itemId);
              return (
                <div key={i} className="animate-pop border-b border-row px-3.5 py-2.5">
                  <div className="grid grid-cols-[1fr_76px_92px_84px_88px_90px_100px_30px] items-center gap-2">
                    <select className="input !py-1.5 text-[13px]" data-testid={`edit-item-${i}`} value={r.itemId} onChange={(e) => pickItem(i, e.target.value)}>
                      <option value="">{t("invoices.editForm.selectItem")}</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name}
                          {it.isPrawn ? " 🦐" : ""}
                        </option>
                      ))}
                    </select>
                    <input className="input !py-1.5 font-mono text-[13px]" data-testid={`edit-cartons-${i}`} inputMode="numeric" value={r.cartonCount}
                      onChange={(e) => updateRow(i, { cartonCount: e.target.value })} />
                    <input className="input !py-1.5 font-mono text-[13px]" data-testid={`edit-gross-${i}`} inputMode="decimal" value={r.grossWeightKg}
                      onChange={(e) => updateRow(i, { grossWeightKg: e.target.value })} />
                    {channel === "north" ? (
                      <input className="input !py-1.5 font-mono text-[13px]" data-testid={`edit-final-${i}`} inputMode="decimal" value={r.finalWeightKg}
                        onChange={(e) => updateRow(i, { finalWeightKg: e.target.value })} placeholder={t("invoices.editForm.netKgPlaceholder")} />
                    ) : (
                      <input className="input !py-1.5 font-mono text-[13px]" data-testid={`edit-glazing-${i}`} inputMode="decimal" value={r.glazingPercent} disabled placeholder="0" />
                    )}
                    <input className="input !py-1.5 font-mono text-[13px]" data-testid={`edit-rate-${i}`} inputMode="decimal" value={r.ratePerKg}
                      onChange={(e) => updateRow(i, { ratePerKg: e.target.value })} />
                    <span className="text-right font-mono text-[13px] text-text">
                      {c?.result ? kg(c.result.netWeightKg) : "—"}
                    </span>
                    <span className="text-right font-mono text-[13px] font-semibold text-ink">
                      {c?.result ? pkr(c.result.amount) : "—"}
                    </span>
                    {rows.length > 1 ? (
                      <button type="button" data-testid={`edit-remove-${i}`}
                        onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                        title={t("invoices.editForm.removeLine")}
                        className="justify-self-center text-[15px] text-faint2 hover:text-neg">×</button>
                    ) : (
                      <span />
                    )}
                  </div>

                  {/* Live packets + alerts */}
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Field label={t("invoices.editForm.labelPackets")}>
                      <input className="input !py-1.5 font-mono text-[13px]" data-testid={`edit-packets-${i}`} inputMode="numeric" value={r.packetCount}
                        onChange={(e) => updateRow(i, { packetCount: e.target.value })} />
                    </Field>
                    <Field label={t("invoices.editForm.labelExpectedPackets")} hint={t("invoices.editForm.hintShortCount")}>
                      <input className="input !py-1.5 font-mono text-[13px]" data-testid={`edit-expected-${i}`} inputMode="numeric" value={r.expectedPacketCount}
                        onChange={(e) => updateRow(i, { expectedPacketCount: e.target.value })}
                        placeholder={item ? String((Number(r.cartonCount) || 0) * item.packetsPerCarton || "") : ""} />
                    </Field>
                    <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 self-end text-[12px] sm:col-span-2">
                      {c?.error && <span className="text-warn">⚠ {c.error}</span>}
                      {c?.result && (
                        <>
                          <span className="text-muted">{t("invoices.editForm.glazing")} <strong className="font-mono text-text">{pct(c.result.glazingPercent)}</strong></span>
                          {c.result.varianceAlert && (
                            <Chip tone="neg">
                              {t("invoices.editForm.overDeduction")} {pct(c.result.varianceAlert.actualPercent)} {t("invoices.editForm.varianceVs")} {pct(c.result.varianceAlert.expectedPercent)} (+{pct(c.result.varianceAlert.exceededByPercent)})
                            </Chip>
                          )}
                          {c.result.packetShortAlert && (
                            <Chip tone="warn">
                              {t("invoices.editForm.short")} {c.result.packetShortAlert.shortBy}: {c.result.packetShortAlert.actual}/{c.result.packetShortAlert.expected}
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
          <button
            type="button"
            data-testid="edit-add-line"
            onClick={() => setRows((rs) => [...rs, { ...emptyLine }])}
            className="block w-full px-3.5 py-3 text-left text-[13px] font-semibold text-accent transition-colors hover:bg-card2"
            style={{ background: "var(--card-2)" }}
          >
            {t("invoices.editForm.addLine")}
          </button>
        </Card>

        <div className="px-0.5 text-[12px] text-faint">
          {t("invoices.editForm.footNote")}
        </div>

        {error && <p className="text-sm text-neg">{error}</p>}
      </div>

      {/* Summary panel (dark ink, sticky) */}
      <div
        className="sticky top-[84px] rounded-2xl p-5"
        style={{ background: "var(--side-bg)", color: "var(--side-fg)" }}
      >
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--side-dim)" }}>
          {t("invoices.editForm.summary")}
        </div>
        <div className="my-3.5 flex flex-col gap-2.5 text-[13px]">
          <div className="flex justify-between">
            <span style={{ color: "var(--side-dim)" }}>{t("invoices.editForm.summaryInvoice")}</span>
            <span className="font-mono">#{invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--side-dim)" }}>{t("invoices.editForm.summaryChannel")}</span>
            <span className="font-semibold capitalize">{channel}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--side-dim)" }}>{t("invoices.editForm.summaryLines")}</span>
            <span className="font-mono">{rows.length}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--side-dim)" }}>{t("invoices.editForm.summaryNetWeight")}</span>
            <span className="font-mono">{kg(netWeightTotal)}</span>
          </div>
          <label className="mt-1 block">
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--side-dim)" }}>
              {t("invoices.editForm.summaryNotes")}
            </div>
            <input
              data-testid="edit-notes"
              placeholder={t("invoices.editForm.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg px-2.5 py-2 text-[13px] outline-none"
              style={{
                background: "rgba(242,235,217,.08)",
                border: "1px solid rgba(242,235,217,.22)",
                color: "var(--side-fg)",
              }}
            />
          </label>
        </div>
        <div className="border-t pt-3.5" style={{ borderColor: "rgba(242,235,217,.14)" }}>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--side-dim)" }}>
            {t("invoices.editForm.summaryTotal")}
          </div>
          <div className="mt-1.5 font-mono text-[28px] font-semibold tracking-tight">
            {pkr(total)}
          </div>
        </div>
        <button
          onClick={submit}
          disabled={!canSubmit}
          data-testid="edit-save"
          className="mt-4 w-full rounded-[10px] py-3 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? t("invoices.editForm.saving") : `${t("invoices.editForm.saveChanges")} #${invoiceNumber}`}
        </button>
        <a
          href={`/invoices/${invoiceId}`}
          className="mt-2.5 block text-center text-[13px]"
          style={{ color: "var(--side-dim)" }}
        >
          {t("invoices.editForm.cancel")}
        </a>
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
