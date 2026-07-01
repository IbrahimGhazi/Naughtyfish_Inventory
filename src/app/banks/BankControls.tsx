"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pkr } from "@/lib/format";
import { createBankAccount, updateBankBalance } from "./actions";

/** Inline manual balance edit for one account. Never auto-decremented. */
export function BalanceEditor({
  id,
  balance,
}: {
  id: string;
  balance: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(balance));
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateBankBalance({ id, estimatedBalance: Number(value) });
        setEditing(false);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold">{pkr(balance)}</span>
        <button
          type="button"
          data-testid={`bank-${id}-edit`}
          onClick={() => {
            setValue(String(balance));
            setEditing(true);
          }}
          className="text-xs text-cyan-700 hover:underline dark:text-cyan-400"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="input max-w-[10rem]"
        data-testid={`bank-${id}-balance`}
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        data-testid={`bank-${id}-save`}
        disabled={isPending}
        onClick={save}
        className="rounded-md bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-40"
      >
        {isPending ? "…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

/** Add-account form. */
export function AddBankForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [estimatedBalance, setEstimatedBalance] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!bankName.trim() && !!accountName.trim() && !isPending;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await createBankAccount({
          bankName,
          accountName,
          estimatedBalance: estimatedBalance ? Number(estimatedBalance) : 0,
        });
        setBankName("");
        setAccountName("");
        setEstimatedBalance("");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Bank name">
          <input className="input" data-testid="add-bank-name" value={bankName}
            onChange={(e) => setBankName(e.target.value)} />
        </Field>
        <Field label="Account name">
          <input className="input" data-testid="add-account-name" value={accountName}
            onChange={(e) => setAccountName(e.target.value)} />
        </Field>
        <Field label="Opening est. balance (PKR)">
          <input className="input" data-testid="add-balance" inputMode="decimal" value={estimatedBalance}
            onChange={(e) => setEstimatedBalance(e.target.value)} />
        </Field>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={submit} disabled={!canSubmit} data-testid="add-bank-submit"
        className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-40">
        {isPending ? "Saving…" : "Add account"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
