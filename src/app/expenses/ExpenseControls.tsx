"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCopy } from "@/lib/copy/CopyProvider";
import { addExpenseCategory, addExpenseEntry, deleteExpenseCategory } from "./actions";

export interface FormCategory {
  id: string;
  name: string;
}

/** Flat "add category" form (plan §4.8 — "give me an add option"). */
export function AddCategoryForm() {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!name.trim() && !isPending;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await addExpenseCategory({ name: name.trim() });
        setName("");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        className="input max-w-xs"
        data-testid="exp-cat-name"
        placeholder={t("expenses.catPlaceholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSubmit) submit();
        }}
      />
      <button
        onClick={submit}
        disabled={!canSubmit}
        data-testid="exp-cat-add"
        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
        style={{ background: "var(--accent)" }}
      >
        {isPending ? t("expenses.catAdding") : t("expenses.catAdd")}
      </button>
      {error && <span className="text-xs text-neg">{error}</span>}
    </div>
  );
}

/**
 * A category chip with its running total. Categories with NO entries can be
 * removed (× → inline confirm); categories that already have expenses show no
 * remove control — the server rejects deleting them and the money is preserved.
 */
export function CategoryChip({
  id,
  name,
  total,
  isOwnerAdded,
  hasEntries,
}: {
  id: string;
  name: string;
  total: string;
  isOwnerAdded: boolean;
  hasEntries: boolean;
}) {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteExpenseCategory(id);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
        setConfirming(false);
      }
    });
  }

  return (
    <span
      data-testid={`exp-cat-${id}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-card px-3 py-1.5 text-[12.5px] font-semibold text-text"
    >
      {name}
      <span className="font-mono text-[11px] text-gold">{total}</span>
      {isOwnerAdded && <span className="text-[11px] text-faint">{t("expenses.catAddedSuffix")}</span>}
      {!hasEntries &&
        (confirming ? (
          <span className="ml-1 inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={remove}
              disabled={isPending}
              data-testid={`exp-cat-del-confirm-${id}`}
              className="text-[11px] font-semibold text-neg hover:underline disabled:opacity-50"
            >
              {t("expenses.catRemoveYes")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-[11px] text-faint hover:underline"
            >
              {t("expenses.catRemoveNo")}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            title={t("expenses.catRemove")}
            aria-label={t("expenses.catRemove")}
            data-testid={`exp-cat-del-${id}`}
            className="-mr-1 ml-0.5 text-[15px] leading-none text-faint hover:text-neg"
          >
            ×
          </button>
        ))}
      {error && <span className="ml-1 text-[10.5px] font-normal text-neg">{error}</span>}
    </span>
  );
}

/** Add an expense entry against a category. */
export function AddEntryForm({ categories }: { categories: FormCategory[] }) {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const canSubmit = !!categoryId && !!amount && Number(amount) > 0 && !isPending;

  function submit() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await addExpenseEntry({
          categoryId,
          amount: Number(amount),
          date: date || undefined,
          note: note || undefined,
        });
        setAmount("");
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label={t("expenses.fieldCategory")}>
          <select className="input" data-testid="exp-entry-category" value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t("expenses.selectOption")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t("expenses.fieldAmount")}>
          <input className="input" data-testid="exp-entry-amount" inputMode="decimal" value={amount}
            onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={t("expenses.fieldDate")} hint={t("expenses.dateHint")}>
          <input type="date" className="input" data-testid="exp-entry-date" value={date}
            onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={t("expenses.fieldNote")}>
          <input className="input" data-testid="exp-entry-note" value={note}
            onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={!canSubmit} data-testid="exp-entry-add"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}>
          {isPending ? t("expenses.entrySaving") : t("expenses.entryAdd")}
        </button>
        {ok && <span className="text-xs text-pos">{t("expenses.entrySaved")}</span>}
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
