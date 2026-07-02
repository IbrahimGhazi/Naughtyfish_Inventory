"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Chip, GhostButton, PrimaryButton } from "@/components/ui";
import { pkr } from "@/lib/format";
import { useCopy } from "@/lib/copy/CopyProvider";
import { cancelProcess, completeProcess, createProcess, startProcess } from "./actions";

export interface ProcOption {
  id: string;
  name: string;
}

/* ------------------------------ New process ------------------------------ */

export function NewProcessForm({
  items,
  stores,
  weightUnit,
  canCancel,
}: {
  items: ProcOption[];
  stores: ProcOption[];
  weightUnit: string;
  canCancel: boolean;
}) {
  const t = useCopy();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    name: "",
    destination: "",
    materialNote: "",
    itemId: "",
    fromStoreId: "",
    quantityKg: "",
    expectedDays: "",
    estimatedCost: "",
    notes: "",
    startNow: true,
  });
  void canCancel;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await createProcess({
          name: f.name,
          destination: f.destination,
          materialNote: f.materialNote || undefined,
          itemId: f.itemId || undefined,
          fromStoreId: f.fromStoreId || undefined,
          quantityKg: f.quantityKg ? Number(f.quantityKg) : undefined,
          expectedDays: f.expectedDays ? Number(f.expectedDays) : undefined,
          estimatedCost: f.estimatedCost ? Number(f.estimatedCost) : undefined,
          notes: f.notes || undefined,
          startNow: f.startNow,
        });
        setF({ name: "", destination: "", materialNote: "", itemId: "", fromStoreId: "", quantityKg: "", expectedDays: "", estimatedCost: "", notes: "", startNow: true });
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
        <Field label={t("processes.form.name.label")} hint={t("processes.form.name.hint")}>
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label={t("processes.form.destination.label")} hint={t("processes.form.destination.hint")}>
          <input className="input" value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} />
        </Field>
        <Field label={t("processes.form.material.label")} hint={t("processes.form.material.hint")}>
          <input className="input" value={f.materialNote} onChange={(e) => setF({ ...f, materialNote: e.target.value })} />
        </Field>
        <Field label={t("processes.form.item.label")} hint={t("processes.form.item.hint")}>
          <select className="input" value={f.itemId} onChange={(e) => setF({ ...f, itemId: e.target.value })}>
            <option value="">—</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t("processes.form.fromStore.label")} hint={t("processes.form.fromStore.hint")}>
          <select className="input" value={f.fromStoreId} onChange={(e) => setF({ ...f, fromStoreId: e.target.value })}>
            <option value="">—</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label={`${t("processes.form.quantity.label")} (${weightUnit})`} hint={t("processes.form.quantity.hint")}>
          <input className="input font-mono" inputMode="decimal" value={f.quantityKg}
            onChange={(e) => setF({ ...f, quantityKg: e.target.value })} />
        </Field>
        <Field label={t("processes.form.turnaround.label")} hint={t("processes.form.turnaround.hint")}>
          <input className="input font-mono" inputMode="numeric" value={f.expectedDays}
            onChange={(e) => setF({ ...f, expectedDays: e.target.value })} />
        </Field>
        <Field label={t("processes.form.estimatedCost.label")} hint={t("processes.form.estimatedCost.hint")}>
          <input className="input font-mono" inputMode="decimal" value={f.estimatedCost}
            onChange={(e) => setF({ ...f, estimatedCost: e.target.value })} />
        </Field>
        <Field label={t("processes.form.notes.label")} hint={t("processes.form.notes.hint")}>
          <input className="input" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </Field>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text">
          <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={f.startNow}
            onChange={(e) => setF({ ...f, startNow: e.target.checked })} />
          {t("processes.form.startNow")}
        </label>
        <div className="flex items-center gap-2">
          {error && <span className="text-[12.5px] text-neg">⚠ {error}</span>}
          <GhostButton type="button" onClick={() => setOpen(false)} disabled={isPending}>
            {t("processes.form.cancel")}
          </GhostButton>
          <PrimaryButton type="button" onClick={submit}
            disabled={isPending || !f.name.trim() || !f.destination.trim()}>
            {isPending ? t("processes.form.saving") : t("processes.form.save")}
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
