"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { computeLine, computeInvoiceTotal, type Channel, type LineResult } from "@/lib/billing";
import { pkr, kg, pct } from "@/lib/format";
import { Card, Chip } from "@/components/ui";
import DatePicker from "@/components/DatePicker";
import { useCopy } from "@/lib/copy/CopyProvider";
import { createInvoice } from "../actions";

function todayYMD(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

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
export interface FormNote {
  id: string;
  text: string;
  isDefault: boolean;
}

interface LineRow {
  itemId: string;
  grossWeightKg: string;
  finalWeightKg: string;
  glazingPercent: string;
  ratePerKg: string;
  cartonCount: string;
  packetCount: string;
}

const emptyLine: LineRow = {
  itemId: "",
  grossWeightKg: "",
  finalWeightKg: "",
  glazingPercent: "",
  ratePerKg: "",
  cartonCount: "",
  packetCount: "",
};

export interface FormLabels {
  packagePlural: string;
  subUnitPlural: string;
  weightUnit: string;
  glazingLabel: string;
  channelNorth: string;
  channelLocal: string;
}
const DEFAULT_LABELS: FormLabels = {
  packagePlural: "Cartons",
  subUnitPlural: "Packets",
  weightUnit: "kg",
  glazingLabel: "Glazing",
  channelNorth: "North (frozen)",
  channelLocal: "Local (fresh)",
};

export default function InvoiceForm({
  parties,
  items,
  stores,
  savedNotes = [],
  labels = DEFAULT_LABELS,
  showGlazing = true,
  showPackaging = true,
  deliveryMode = false,
}: {
  parties: FormParty[];
  items: FormItem[];
  stores: FormStore[];
  savedNotes?: FormNote[];
  labels?: FormLabels;
  showGlazing?: boolean;
  showPackaging?: boolean;
  /** Delivery portal: submissions become drafts; success links stay in-portal. */
  deliveryMode?: boolean;
}) {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [partyId, setPartyId] = useState("");
  const [channel, setChannel] = useState<Channel>("north");
  const [sourceStoreId, setSourceStoreId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [date, setDate] = useState(() => todayYMD());
  const [notes, setNotes] = useState(
    () => savedNotes.find((n) => n.isDefault)?.text ?? "",
  );
  const [rows, setRows] = useState<LineRow[]>([{ ...emptyLine }]);
  const [expenseRows, setExpenseRows] = useState<{ label: string; amount: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; invoiceNumber: number; referenceNumber: string | null; total: number } | null>(null);

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
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes || undefined,
          date: date || undefined,
          expenses: expenseRows
            .filter((r) => r.label.trim() && r.amount.trim())
            .map((r) => ({ label: r.label.trim(), amount: Number(r.amount) })),
          lines: rows.map((r) => ({
            itemId: r.itemId,
            grossWeightKg: Number(r.grossWeightKg),
            finalWeightKg: r.finalWeightKg ? Number(r.finalWeightKg) : undefined,
            glazingPercent: r.glazingPercent ? Number(r.glazingPercent) : undefined,
            ratePerKg: Number(r.ratePerKg),
            cartonCount: r.cartonCount ? Number(r.cartonCount) : undefined,
            packetCount: r.packetCount ? Number(r.packetCount) : undefined,
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
          ✓ {t("invoices.form.invoicePrefix")} #{done.invoiceNumber} {deliveryMode ? t("invoices.form.sentForReview") : t("invoices.form.savedSuffix")}
        </h2>
        <p className="mt-1 text-sm text-text">
          {done.referenceNumber ? `${t("invoices.form.referencePrefix")} ${done.referenceNumber} · ` : ""}
          {t("invoices.form.totalPrefix")} <span className="font-mono">{pkr(done.total)}</span>.{" "}
          {deliveryMode
            ? t("invoices.form.successDraft")
            : t("invoices.form.successImmutable")}
        </p>
        <div className="mt-4 flex gap-4 text-sm">
          <a
            href={`/invoices/${done.id}`}
            className="font-semibold text-accent-deep underline"
          >
            {t("invoices.form.openInvoice")}
          </a>
          {!deliveryMode && (
          <a href={`/parties/${partyId}`} className="font-semibold text-accent-deep underline">
            {t("invoices.form.viewLedger")}
          </a>
          )}
          <button
            onClick={() => {
              setDone(null);
              setRows([{ ...emptyLine }]);
            }}
            className="font-semibold text-muted underline"
          >
            {t("invoices.form.newAnother")}
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
            <Field label={t("invoices.form.labelParty")}>
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
                <option value="">{t("invoices.form.selectParty")}</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.subType ? `(${p.subType})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("invoices.form.labelChannel")}>
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
                    {c === "north" ? labels.channelNorth : labels.channelLocal}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("invoices.form.labelReferenceNumber")} hint={t("invoices.form.hintOptional")}>
              <input
                className="input"
                placeholder={t("invoices.form.referenceNumberPlaceholder")}
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </Field>
            <Field label={t("invoices.form.labelDate")}>
              <DatePicker data-testid="invoice-date" value={date} onChange={setDate} />
            </Field>
            <Field label={t("invoices.form.labelNotes")} hint={t("invoices.form.hintOptional")}>
              {savedNotes.length > 0 && (
                <select
                  className="input mb-2"
                  data-testid="invoice-note-pick"
                  value=""
                  onChange={(e) => {
                    const n = savedNotes.find((x) => x.id === e.target.value);
                    if (n) setNotes(n.text);
                  }}
                >
                  <option value="">{t("invoices.form.notesPick")}</option>
                  {savedNotes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.isDefault ? "★ " : ""}
                      {n.text.length > 60 ? n.text.slice(0, 60) + "…" : n.text}
                    </option>
                  ))}
                </select>
              )}
              <input className="input" placeholder={t("invoices.form.notesPlaceholder")} value={notes}
                onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* Line-items table. Fixed-pixel column grid — wrapped in a shared
            horizontal-scroll region (mobile) so header + rows always stay
            column-aligned; the Add-line button stays outside it, full width. */}
        <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[1fr_76px_92px_84px_88px_90px_100px_30px] items-center gap-2 border-b border-hair2 bg-card2 px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-faint2">
            <span>{t("invoices.form.colItem")}</span>
            <span>{labels.packagePlural}</span>
            <span>{t("invoices.form.colGross")} {labels.weightUnit}</span>
            <span>{labels.glazingLabel} %</span>
            <span>{t("invoices.form.colRate")}</span>
            <span className="text-right">{t("invoices.form.colNet")} {labels.weightUnit}</span>
            <span className="text-right">{t("invoices.form.colAmount")}</span>
            <span />
          </div>
          <div>
            {rows.map((r, i) => {
              const c = computed[i];
              return (
                <div key={i} className="animate-pop border-b border-row px-3.5 py-2.5">
                  <div className="grid grid-cols-[1fr_76px_92px_84px_88px_90px_100px_30px] items-center gap-2">
                    <select className="input !py-1.5 text-[13px]" data-testid={`item-${i}`} value={r.itemId} onChange={(e) => pickItem(i, e.target.value)}>
                      <option value="">{t("invoices.form.selectItem")}</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>{it.name}{it.isPrawn ? " 🦐" : ""}</option>
                      ))}
                    </select>
                    <input className="input !py-1.5 font-mono text-[13px]" data-testid={`cartons-${i}`} inputMode="numeric" value={r.cartonCount}
                      onChange={(e) => updateRow(i, { cartonCount: e.target.value })} />
                    <input className="input !py-1.5 font-mono text-[13px]" data-testid={`gross-${i}`} inputMode="decimal" value={r.grossWeightKg}
                      onChange={(e) => updateRow(i, { grossWeightKg: e.target.value })} />
                    <input className="input !py-1.5 font-mono text-[13px]" data-testid={`glaze-${i}`} inputMode="decimal" value={r.glazingPercent}
                      onChange={(e) => updateRow(i, { glazingPercent: e.target.value })} placeholder="0" />
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
                        title={t("invoices.form.removeLine")}
                        className="justify-self-center text-[15px] text-faint2 hover:text-neg">×</button>
                    ) : (
                      <span />
                    )}
                  </div>

                  {/* Live packets + alerts */}
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {showPackaging && (
                    <Field label={labels.subUnitPlural}>
                      <input className="input !py-1.5 font-mono text-[13px]" data-testid={`packets-${i}`} inputMode="numeric" value={r.packetCount}
                        onChange={(e) => updateRow(i, { packetCount: e.target.value })} />
                    </Field>
                    )}
                    {channel === "north" && (
                    <Field label={`${t("invoices.form.colNetIn")} ${labels.weightUnit} in`} hint={t("invoices.form.hintOptional")}>
                      <input className="input !py-1.5 font-mono text-[13px]" data-testid={`final-${i}`} inputMode="decimal" value={r.finalWeightKg}
                        onChange={(e) => updateRow(i, { finalWeightKg: e.target.value })} placeholder={`net ${labels.weightUnit}`} />
                    </Field>
                    )}
                    <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] self-end sm:col-span-2">
                      {c?.error && <span className="text-warn">⚠ {c.error}</span>}
                      {c?.result && (
                        <>
                          {showGlazing && (
                          <span className="text-muted">{labels.glazingLabel}: <strong className="font-mono text-text">{pct(c.result.glazingPercent)}</strong></span>
                          )}
                          {c.result.varianceAlert && (
                            <Chip tone="neg">
                              {t("invoices.form.overDeduction")} {pct(c.result.varianceAlert.actualPercent)} {t("invoices.form.varianceVs")} {pct(c.result.varianceAlert.expectedPercent)} (+{pct(c.result.varianceAlert.exceededByPercent)})
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
        </div>
        </div>
          <button type="button" onClick={() => setRows((rs) => [...rs, { ...emptyLine }])}
            className="block w-full px-3.5 py-3 text-left text-[13px] font-semibold text-accent transition-colors hover:bg-card2"
            style={{ background: "var(--card-2)" }}>
            {t("invoices.form.addLine")}
          </button>
        </Card>

        <div className="px-0.5 text-[12px] text-faint">
          {t("invoices.form.recomputeHintPrefix")} {labels.glazingLabel.toLowerCase()} {t("invoices.form.recomputeHintSuffix")}
        </div>

        {/* Custom per-invoice expenses (e.g. "Labour — carrying cartons").
            Internal cost tracking only — never shown on the customer-facing
            invoice/PDF; posts to Expenses on save. */}
        <Card className="p-[18px]">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-serif text-[15px] font-semibold text-ink">
              {t("invoices.form.expensesTitle")}
            </h3>
            <span className="text-[11px] text-faint">{t("invoices.form.expensesHint")}</span>
          </div>
          <div className="flex flex-col gap-2">
            {expenseRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  data-testid={`inv-expense-label-${i}`}
                  placeholder={t("invoices.form.expensesLabelPlaceholder")}
                  value={row.label}
                  onChange={(e) =>
                    setExpenseRows((rs) =>
                      rs.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r)),
                    )
                  }
                />
                <input
                  className="input w-28"
                  data-testid={`inv-expense-amount-${i}`}
                  inputMode="decimal"
                  placeholder={t("invoices.form.expensesAmountPlaceholder")}
                  value={row.amount}
                  onChange={(e) =>
                    setExpenseRows((rs) =>
                      rs.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r)),
                    )
                  }
                />
                <button
                  type="button"
                  data-testid={`inv-expense-remove-${i}`}
                  onClick={() => setExpenseRows((rs) => rs.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-faint hover:text-neg"
                  aria-label={t("invoices.form.expensesRemove")}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            data-testid="inv-expense-add"
            onClick={() => setExpenseRows((rs) => [...rs, { label: "", amount: "" }])}
            className="mt-2.5 text-[13px] font-semibold text-accent hover:underline"
          >
            {t("invoices.form.expensesAdd")}
          </button>
        </Card>

        {error && <p className="text-sm text-neg">{error}</p>}
      </div>

      {/* Summary panel (dark ink, sticky) */}
      <div
        className="sticky top-[84px] rounded-2xl p-5"
        style={{ background: "var(--side-bg)", color: "var(--side-fg)" }}
      >
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--side-dim)" }}>
          {t("invoices.form.summary")}
        </div>
        <div className="my-3.5 flex flex-col gap-2.5 text-[13px]">
          <div className="flex justify-between">
            <span style={{ color: "var(--side-dim)" }}>{t("invoices.form.summaryReference")}</span>
            <span className="font-mono text-gold">{referenceNumber.trim() || t("invoices.form.summaryReferenceEmpty")}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--side-dim)" }}>{t("invoices.form.summaryChannel")}</span>
            <span className="font-semibold capitalize">{channel}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--side-dim)" }}>{t("invoices.form.summaryLines")}</span>
            <span className="font-mono">{rows.length}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--side-dim)" }}>{t("invoices.form.summaryNetWeight")}</span>
            <span className="font-mono">{kg(netWeightTotal)}</span>
          </div>
          <label className="mt-1 block">
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--side-dim)" }}>
              {t("invoices.form.summarySourceStore")}
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
            {t("invoices.form.summaryTotal")}
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
          {isPending ? t("invoices.form.saving") : t("invoices.form.saveInvoice")}
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
