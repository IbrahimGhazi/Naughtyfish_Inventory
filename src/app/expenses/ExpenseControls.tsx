"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addExpenseCategory, addExpenseEntry } from "./actions";

export interface FormCategory {
  id: string;
  name: string;
}

/** Flat "add category" form (plan §4.8 — "give me an add option"). */
export function AddCategoryForm() {
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
        placeholder="New category (e.g. fuel, labor, cartons)"
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
        {isPending ? "Adding…" : "+ Add category"}
      </button>
      {error && <span className="text-xs text-neg">{error}</span>}
    </div>
  );
}

/** Add an expense entry against a category. */
export function AddEntryForm({ categories }: { categories: FormCategory[] }) {
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
        <Field label="Category">
          <select className="input" data-testid="exp-entry-category" value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Amount (PKR)">
          <input className="input" data-testid="exp-entry-amount" inputMode="decimal" value={amount}
            onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Date" hint="defaults to today">
          <input type="date" className="input" data-testid="exp-entry-date" value={date}
            onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note">
          <input className="input" data-testid="exp-entry-note" value={note}
            onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={!canSubmit} data-testid="exp-entry-add"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}>
          {isPending ? "Saving…" : "Add expense"}
        </button>
        {ok && <span className="text-xs text-pos">✓ Saved.</span>}
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
