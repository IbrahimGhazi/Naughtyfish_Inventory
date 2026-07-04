"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { pkr, kg } from "@/lib/format";
import { useCopy } from "@/lib/copy/CopyProvider";
import { createPurchase } from "../actions";

export interface FormSupplier {
  id: string;
  name: string;
}
export interface FormStore {
  id: string;
  name: string;
}
export interface FormItem {
  id: string;
  name: string;
  rate: number | null; // item's fixedRate as a convenience default
}

interface Line {
  itemId: string;
  weightKg: string;
  ratePerKg: string;
  cartons: string;
  packets: string;
}

const EMPTY_LINE: Line = { itemId: "", weightKg: "", ratePerKg: "", cartons: "", packets: "" };

/** Fully-blank rows are ignored; any partially-filled row must be complete. */
const rowIsEmpty = (l: Line) => !l.itemId && !l.weightKg && !l.ratePerKg && !l.cartons && !l.packets;
const intOk = (v: string) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0);
const rowIsValid = (l: Line) =>
  !!l.itemId && Number(l.weightKg) > 0 && Number(l.ratePerKg) > 0 && intOk(l.cartons) && intOk(l.packets);

const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;
const round3 = (x: number) => Math.round((x + Number.EPSILON) * 1000) / 1000;

export default function PurchaseForm({
  suppliers,
  stores,
  items,
  nextReference,
}: {
  suppliers: FormSupplier[];
  stores: FormStore[];
  items: FormItem[];
  nextReference: string;
}) {
  const t = useCopy();
  const [isPending, startTransition] = useTransition();

  const [partyId, setPartyId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [supplierBillNo, setSupplierBillNo] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; reference: string; total: number } | null>(null);

  const patchLine = (ix: number, patch: Partial<Line>) => {
    setLines((ls) => ls.map((l, i) => (i === ix ? { ...l, ...patch } : l)));
  };

  const lineAmount = (l: Line) => {
    const w = Number(l.weightKg);
    const r = Number(l.ratePerKg);
    return w > 0 && r > 0 ? round2(w * r) : 0;
  };

  // Rows the user actually touched: ALL of them must be valid to save — a
  // half-filled line blocks submission instead of being silently dropped.
  const activeLines = lines.filter((l) => !rowIsEmpty(l));
  const allActiveValid = activeLines.every(rowIsValid);
  const total = round2(activeLines.filter(rowIsValid).reduce((s, l) => s + lineAmount(l), 0));
  const totalWeight = round3(
    activeLines.filter(rowIsValid).reduce((s, l) => s + Number(l.weightKg), 0),
  );
  const canSubmit =
    !!partyId && !!storeId && activeLines.length > 0 && allActiveValid && !isPending;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await createPurchase({
          partyId,
          storeId,
          supplierBillNo: supplierBillNo || undefined,
          date: date || undefined,
          notes: notes || undefined,
          lines: activeLines.map((l) => ({
            itemId: l.itemId,
            weightKg: Number(l.weightKg),
            ratePerKg: Number(l.ratePerKg),
            cartons: l.cartons ? Number(l.cartons) : undefined,
            packets: l.packets ? Number(l.packets) : undefined,
          })),
        });
        setSaved(res);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  if (saved) {
    return (
      <div className="animate-pop rounded-xl border border-hair bg-card p-6" data-testid="pur-success">
        <div className="font-serif text-[19px] font-semibold text-ink">
          {t("purchases.new.successPrefix")}{" "}
          <span className="font-mono text-gold">{saved.reference}</span>{" "}
          {t("purchases.new.successSuffix")}
        </div>
        <div className="mt-1 font-mono text-[15px] text-text">{pkr(saved.total)}</div>
        <div className="mt-4 flex gap-3">
          <Link
            href={`/purchases/${saved.id}`}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-on-accent"
            style={{ background: "var(--accent)" }}
          >
            {t("purchases.new.viewIt")}
          </Link>
          <button
            type="button"
            onClick={() => {
              setSaved(null);
              setPartyId("");
              setStoreId("");
              setSupplierBillNo("");
              setDate("");
              setNotes("");
              setLines([{ ...EMPTY_LINE }]);
            }}
            className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-text hover:bg-card2"
          >
            {t("purchases.new.another")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        {/* Header fields */}
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-hair bg-card p-[18px] sm:grid-cols-2">
          <Field label={t("purchases.new.supplier")}>
            <select
              className="input"
              data-testid="pur-supplier"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
            >
              <option value="">{t("purchases.new.supplierPick")}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("purchases.new.store")}>
            <select
              className="input"
              data-testid="pur-store"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              <option value="">{t("purchases.new.storePick")}</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("purchases.new.billNo")} hint={t("purchases.new.billNoHint")}>
            <input
              className="input"
              data-testid="pur-billno"
              value={supplierBillNo}
              maxLength={60}
              onChange={(e) => setSupplierBillNo(e.target.value)}
            />
          </Field>
          <Field label={t("purchases.new.date")}>
            <input
              type="date"
              className="input"
              data-testid="pur-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("purchases.new.notes")} hint={t("purchases.new.notesHint")}>
              <input
                className="input"
                data-testid="pur-notes"
                value={notes}
                maxLength={500}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Lines. Fixed-pixel column grid — wrapped in a shared horizontal-
            scroll region (mobile) so header + rows stay column-aligned; the
            Add-line button stays outside it, full width. */}
        <div className="overflow-hidden rounded-xl border border-hair bg-card">
        <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[1fr_88px_88px_70px_70px_96px_30px] items-center gap-2 border-b border-hair2 bg-card2 px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-faint2">
            <span>{t("purchases.new.colItem")}</span>
            <span>{t("purchases.new.colWeight")}</span>
            <span>{t("purchases.new.colRate")}</span>
            <span>{t("purchases.new.colCartons")}</span>
            <span>{t("purchases.new.colPackets")}</span>
            <span className="text-right">{t("purchases.new.colAmount")}</span>
            <span />
          </div>
          {lines.map((l, ix) => (
            <div
              key={ix}
              className="animate-pop grid grid-cols-[1fr_88px_88px_70px_70px_96px_30px] items-center gap-2 border-b border-row px-3.5 py-2.5"
            >
              <select
                className="input"
                data-testid={`pur-line-item-${ix}`}
                value={l.itemId}
                onChange={(e) => {
                  const item = items.find((i) => i.id === e.target.value);
                  patchLine(ix, {
                    itemId: e.target.value,
                    // Convenience: prefill the item's fixed rate; stays editable.
                    ratePerKg:
                      l.ratePerKg || (item?.rate != null ? String(item.rate) : l.ratePerKg),
                  });
                }}
              >
                <option value="">{t("purchases.new.itemPick")}</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <input
                className="input font-mono"
                data-testid={`pur-line-weight-${ix}`}
                inputMode="decimal"
                value={l.weightKg}
                onChange={(e) => patchLine(ix, { weightKg: e.target.value })}
              />
              <input
                className="input font-mono"
                data-testid={`pur-line-rate-${ix}`}
                inputMode="decimal"
                value={l.ratePerKg}
                onChange={(e) => patchLine(ix, { ratePerKg: e.target.value })}
              />
              <input
                className="input font-mono"
                data-testid={`pur-line-cartons-${ix}`}
                inputMode="numeric"
                value={l.cartons}
                onChange={(e) => patchLine(ix, { cartons: e.target.value })}
              />
              <input
                className="input font-mono"
                data-testid={`pur-line-packets-${ix}`}
                inputMode="numeric"
                value={l.packets}
                onChange={(e) => patchLine(ix, { packets: e.target.value })}
              />
              <span
                className="text-right font-mono text-[13px] font-semibold text-text"
                title={!rowIsEmpty(l) && !rowIsValid(l) ? t("purchases.new.lineInvalid") : undefined}
              >
                {!rowIsEmpty(l) && !rowIsValid(l) ? (
                  <span className="text-warn">!</span>
                ) : lineAmount(l) ? (
                  pkr(lineAmount(l))
                ) : (
                  "—"
                )}
              </span>
              <button
                type="button"
                title={t("purchases.new.removeLine")}
                onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== ix) : ls))}
                className="justify-self-end text-[15px] text-faint hover:text-neg"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        </div>
          <button
            type="button"
            data-testid="pur-add-line"
            onClick={() => setLines((ls) => [...ls, { ...EMPTY_LINE }])}
            className="block w-full bg-card2 px-3.5 py-2.5 text-left text-[13px] font-semibold text-accent hover:bg-row"
          >
            {t("purchases.new.addLine")}
          </button>
        </div>

        <p className="px-0.5 text-[12px] text-faint">{t("purchases.new.recompute")}</p>
      </div>

      {/* Summary (dark ink panel, matching the invoice form) */}
      <div
        className="sticky top-[84px] rounded-2xl p-5"
        style={{ background: "var(--side-bg)", color: "var(--side-fg)" }}
      >
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--side-dim)" }}>
          {t("purchases.new.summary")}
        </div>
        <div className="my-3.5 space-y-2 text-[13px]">
          <SummaryRow label={t("purchases.new.sumReference")}>
            <span className="font-mono" style={{ color: "#d9b98a" }}>{nextReference}</span>
          </SummaryRow>
          <SummaryRow label={t("purchases.new.sumLines")}>
            <span className="font-mono">{activeLines.length}</span>
          </SummaryRow>
          <SummaryRow label={t("purchases.new.sumWeight")}>
            <span className="font-mono">{kg(totalWeight)}</span>
          </SummaryRow>
        </div>
        <div className="border-t pt-3.5" style={{ borderColor: "var(--side-hair)" }}>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--side-dim)" }}>
            {t("purchases.new.sumTotal")}
          </div>
          <div className="mt-1 font-mono text-[26px] font-semibold tracking-tight">{pkr(total)}</div>
        </div>
        {error && <p className="mt-3 text-[12.5px]" style={{ color: "#e5a492" }}>{error}</p>}
        <button
          type="button"
          data-testid="pur-save"
          disabled={!canSubmit}
          onClick={submit}
          className="mt-4 w-full rounded-[10px] py-3 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? t("purchases.new.saving") : t("purchases.new.save")}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: "var(--side-dim)" }}>{label}</span>
      {children}
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
