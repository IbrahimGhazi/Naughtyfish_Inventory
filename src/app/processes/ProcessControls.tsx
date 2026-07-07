"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Chip, GhostButton, PrimaryButton } from "@/components/ui";
import { pkr, kg } from "@/lib/format";
import { type ProcessType } from "@/lib/enums";
import ProcessTypesPicker from "@/components/ProcessTypesPicker";
import { useCopy } from "@/lib/copy/CopyProvider";
import { cancelProcess, completeProcess, recordTransformation, startProcess } from "./actions";

export interface ProcOption {
  id: string;
  name: string;
}
export interface StoreOption {
  id: string;
  name: string;
  capabilities: string[];
}

/* ----------------------- New in-house transformation ----------------------- */

export function NewProcessForm({
  stores,
  rawItems,
  processedItems,
  onHand,
  weightUnit,
}: {
  stores: StoreOption[];
  rawItems: ProcOption[];
  processedItems: ProcOption[];
  onHand: Record<string, number>;
  weightUnit: string;
}) {
  const t = useCopy();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    storeId: "",
    inputItemId: "",
    inputKg: "",
    outputItemId: "",
    outputKg: "",
    notes: "",
    postToExpenses: false,
    cost: "",
  });
  const [types, setTypes] = useState<ProcessType[]>([]);

  const store = stores.find((s) => s.id === f.storeId);
  const caps = store?.capabilities;
  const inKg = Number(f.inputKg);
  const outKg = Number(f.outputKg);
  const bothKg = f.inputKg.trim() !== "" && f.outputKg.trim() !== "" && !Number.isNaN(inKg) && !Number.isNaN(outKg);
  const loss = bothKg ? Math.round((inKg - outKg) * 1000) / 1000 : null;
  const yieldP = bothKg && inKg > 0 ? Math.round((outKg / inKg) * 1000) / 10 : null;
  const rawOnHand = f.storeId && f.inputItemId ? onHand[`${f.storeId}:${f.inputItemId}`] ?? 0 : null;
  const procOnHand = f.storeId && f.outputItemId ? onHand[`${f.storeId}:${f.outputItemId}`] ?? 0 : null;

  const typesOk = types.length > 0 && (!caps || types.every((x) => caps.includes(x)));
  const canSubmit =
    !!f.storeId &&
    !!f.inputItemId &&
    !!f.outputItemId &&
    f.inputItemId !== f.outputItemId &&
    inKg > 0 &&
    outKg > 0 &&
    loss !== null &&
    loss >= 0 &&
    typesOk &&
    (!f.postToExpenses || Number(f.cost) > 0) &&
    !isPending;

  function reset() {
    setF({ storeId: "", inputItemId: "", inputKg: "", outputItemId: "", outputKg: "", notes: "", postToExpenses: false, cost: "" });
    setTypes([]);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await recordTransformation({
          storeId: f.storeId,
          inputItemId: f.inputItemId,
          outputItemId: f.outputItemId,
          inputKg: inKg,
          outputKg: outKg,
          processTypes: types,
          notes: f.notes || undefined,
          actualCost: f.postToExpenses && f.cost ? Number(f.cost) : undefined,
          postToExpenses: f.postToExpenses,
        });
        reset();
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  if (!open) {
    return (
      <PrimaryButton type="button" onClick={() => setOpen(true)}>
        <span className="text-base leading-none">+</span> {t("processes.form.addProcess")}
      </PrimaryButton>
    );
  }

  return (
    <Card className="animate-pop p-[18px]">
      <div className="mb-3 font-serif text-[17px] font-semibold text-ink">{t("processes.form.title")}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t("processes.form.store.label")} hint={t("processes.form.store.hint")}>
          <select className="input" data-testid="proc-store" value={f.storeId}
            onChange={(e) => setF({ ...f, storeId: e.target.value })}>
            <option value="">{t("processes.form.selectStore")}</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        <Field label={t("processes.form.inputItem.label")} hint={t("processes.form.inputItem.hint")}>
          <select className="input" data-testid="proc-input-item" value={f.inputItemId}
            onChange={(e) => setF({ ...f, inputItemId: e.target.value })}>
            <option value="">{t("processes.form.selectRaw")}</option>
            {rawItems.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          {rawOnHand !== null && (
            <span className="mt-1 block text-[11px] text-faint">{t("processes.form.onHand")} {kg(rawOnHand)}</span>
          )}
        </Field>
        <Field label={`${t("processes.form.inputKg.label")} (${weightUnit})`}>
          <input className="input font-mono" data-testid="proc-input-kg" inputMode="decimal"
            value={f.inputKg} onChange={(e) => setF({ ...f, inputKg: e.target.value })} />
        </Field>

        <Field label={t("processes.form.outputItem.label")} hint={t("processes.form.outputItem.hint")}>
          <select className="input" data-testid="proc-output-item" value={f.outputItemId}
            onChange={(e) => setF({ ...f, outputItemId: e.target.value })}>
            <option value="">{t("processes.form.selectProcessed")}</option>
            {processedItems.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          {procOnHand !== null && (
            <span className="mt-1 block text-[11px] text-faint">{t("processes.form.onHand")} {kg(procOnHand)}</span>
          )}
        </Field>
        <Field label={`${t("processes.form.outputKg.label")} (${weightUnit})`}>
          <input className="input font-mono" data-testid="proc-output-kg" inputMode="decimal"
            value={f.outputKg} onChange={(e) => setF({ ...f, outputKg: e.target.value })} />
        </Field>

        <div className="sm:col-span-2 lg:col-span-3">
          <Field label={t("processes.form.types.label")} hint={f.storeId ? t("processes.form.types.hint") : t("processes.form.types.pickStoreFirst")}>
            <ProcessTypesPicker value={types} onChange={setTypes} allowed={caps} idPrefix="proc"
              disabledReason={t("processes.form.types.pickStoreFirst")} />
          </Field>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <Field label={t("processes.form.notes.label")} hint={t("processes.form.notes.hint")}>
            <input className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </Field>
        </div>
      </div>

      {/* Live stock-effect strip */}
      {(bothKg || (f.inputItemId && f.outputItemId)) && (
        <div className="mt-3 rounded-lg border border-hair2 bg-card2 px-3.5 py-2.5 text-[13px]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="text-faint">
              {t("processes.form.loss")}:{" "}
              <strong className={`font-mono ${loss !== null && loss < 0 ? "text-neg" : "text-text"}`}>
                {loss !== null ? kg(loss) : "—"}
              </strong>
            </span>
            <span className="text-faint">
              {t("processes.form.yield")}:{" "}
              <strong className="font-mono text-text">{yieldP !== null ? `${yieldP}%` : "—"}</strong>
            </span>
          </div>
          {rawOnHand !== null && procOnHand !== null && inKg > 0 && outKg > 0 && loss !== null && loss >= 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-faint">
              <span>{t("processes.form.effect.rawOut")}: <span className="font-mono text-neg">−{kg(inKg)}</span> → {kg(rawOnHand - inKg)}</span>
              <span>{t("processes.form.effect.processedIn")}: <span className="font-mono text-pos">+{kg(outKg)}</span> → {kg(procOnHand + outKg)}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text">
          <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={f.postToExpenses}
            onChange={(e) => setF({ ...f, postToExpenses: e.target.checked })} />
          {t("processes.form.postCost")}
          {f.postToExpenses && (
            <input className="input !w-28 !py-1.5 text-right font-mono text-[13px]"
              placeholder={t("processes.form.costPlaceholder")} inputMode="decimal"
              value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} />
          )}
        </label>
        <div className="flex items-center gap-2">
          {error && <span className="text-[12.5px] text-neg">⚠ {error}</span>}
          <GhostButton type="button" onClick={() => { setOpen(false); }} disabled={isPending}>
            {t("processes.form.cancel")}
          </GhostButton>
          <PrimaryButton type="button" data-testid="proc-submit" onClick={submit} disabled={!canSubmit}>
            {isPending ? t("processes.form.saving") : t("processes.form.record")}
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------ Row actions ------------------------------ */

export function ProcessRowActions({
  id,
  status,
  estimatedCost,
  canCancel,
}: {
  id: string;
  status: string;
  estimatedCost: number | null;
  canCancel: boolean;
}) {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [actualCost, setActualCost] = useState(estimatedCost != null ? String(estimatedCost) : "");
  const [postToExpenses, setPostToExpenses] = useState(false);

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      try {
        setError(null);
        await fn();
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });

  if (status === "completed" || status === "cancelled") {
    return null;
  }

  if (completing) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <input
          className="input !w-28 !py-1.5 text-right font-mono text-[13px]"
          placeholder={t("processes.actions.actualCostPlaceholder")}
          inputMode="decimal"
          value={actualCost}
          onChange={(e) => setActualCost(e.target.value)}
        />
        <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-muted" title={t("processes.actions.postToExpensesTitle")}>
          <input type="checkbox" className="h-3.5 w-3.5 accent-[var(--accent)]" checked={postToExpenses}
            onChange={(e) => setPostToExpenses(e.target.checked)} />
          {t("processes.actions.postToExpenses")}
        </label>
        <button type="button" disabled={isPending}
          onClick={() =>
            run(() =>
              completeProcess({
                id,
                actualCost: actualCost ? Number(actualCost) : undefined,
                postToExpenses,
              }),
            )
          }
          className="rounded-md px-2.5 py-1.5 text-[12px] font-semibold text-on-accent disabled:opacity-50"
          style={{ background: "var(--pos)" }}>
          {isPending ? "…" : t("processes.actions.done")}
        </button>
        <button type="button" className="text-[12px] font-semibold text-muted" onClick={() => setCompleting(false)}>
          {t("processes.actions.back")}
        </button>
        {error && <span className="w-full text-right text-[11.5px] text-neg">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status === "planned" && (
        <button type="button" disabled={isPending} onClick={() => run(() => startProcess(id))}
          className="rounded-md border border-hair px-2.5 py-1.5 text-[12px] font-semibold text-accent-deep hover:bg-card2 disabled:opacity-50">
          {t("processes.actions.start")}
        </button>
      )}
      <button type="button" disabled={isPending} onClick={() => setCompleting(true)}
        className="rounded-md border border-hair px-2.5 py-1.5 text-[12px] font-semibold text-pos hover:bg-card2 disabled:opacity-50">
        {t("processes.actions.complete")}
      </button>
      {canCancel && (
        <button type="button" disabled={isPending} onClick={() => run(() => cancelProcess(id))}
          className="rounded-md px-2 py-1.5 text-[12px] font-semibold text-faint hover:text-neg disabled:opacity-50">
          ✕
        </button>
      )}
      {error && <span className="w-full text-right text-[11.5px] text-neg">{error}</span>}
    </div>
  );
}

/* -------------------------------- helpers -------------------------------- */

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

/** Exported for the page's summary chips. */
export function CostChip({ est, actual }: { est: number | null; actual: number | null }) {
  const t = useCopy();
  if (actual != null) return <Chip tone="pos">{t("processes.cost.actual")} {pkr(actual)}</Chip>;
  if (est != null) return <Chip tone="neutral">{t("processes.cost.est")} {pkr(est)}</Chip>;
  return <span className="text-faint">—</span>;
}
