"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCopy } from "@/lib/copy/CopyProvider";
import { addExpenseEntry } from "@/app/expenses/actions";

export interface FormCategory {
  id: string;
  name: string;
}

/**
 * Add a dated cost against a specific store. Reuses addExpenseEntry with a
 * storeId — the entry is an ordinary expense that rolls into the Expenses total
 * and the dashboard P&L, but is attributed to (and shown under) this store.
 */
export function AddStoreCostForm({
  storeId,
  categories,
}: {
  storeId: string;
  categories: FormCategory[];
}) {
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
          storeId,
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
        <Field label={t("stores.fieldCategory")}>
          <select
            className="input"
            data-testid="store-cost-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">{t("stores.selectOption")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t("stores.fieldAmount")}>
          <input
            className="input"
            data-testid="store-cost-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label={t("stores.fieldDate")} hint={t("stores.dateHint")}>
          <input
            type="date"
            className="input"
            data-testid="store-cost-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label={t("stores.fieldNote")}>
          <input
            className="input"
            data-testid="store-cost-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={!canSubmit}
          data-testid="store-cost-add"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? t("stores.adding") : t("stores.add")}
        </button>
        {ok && <span className="text-xs text-pos">{t("stores.saved")}</span>}
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
