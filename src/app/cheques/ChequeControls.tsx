"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCopy } from "@/lib/copy/CopyProvider";
import { updateChequeStatus, createOutgoingCheque } from "./actions";

const NEXT_BY_STATUS: Record<string, string[]> = {
  issued: ["cleared", "held", "bounced"],
  pending: ["cleared", "held", "bounced"],
  held: ["cleared", "bounced"],
  bounced: ["cleared", "held"],
  cleared: [],
};

const LABEL_KEYS: Record<string, string> = {
  cleared: "cheques.actionMarkCleared",
  held: "cheques.actionHold",
  bounced: "cheques.actionBounced",
};

/** Inline status-transition buttons for one cheque row. */
export function ChequeStatusButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const t = useCopy();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next = NEXT_BY_STATUS[status] ?? [];

  if (status === "cleared" || next.length === 0) {
    return <span className="text-xs text-faint">—</span>;
  }

  function move(to: string) {
    setError(null);
    startTransition(async () => {
      try {
        await updateChequeStatus({ chequeId: id, status: to as never });
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {next.map((to) => (
        <button
          key={to}
          type="button"
          data-testid={`cheque-${id}-${to}`}
          disabled={isPending}
          onClick={() => move(to)}
          className="rounded-lg border border-hair px-2 py-1 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent-deep disabled:opacity-40"
        >
          {LABEL_KEYS[to] ? t(LABEL_KEYS[to]) : to}
        </button>
      ))}
      {error && <span className="text-xs text-neg">{error}</span>}
    </div>
  );
}

export interface FormBank {
  id: string;
  label: string;
}

/** "New outgoing cheque" form — records which cheque was handed to whom. */
export function OutgoingChequeForm({ banks }: { banks: FormBank[] }) {
  const router = useRouter();
  const t = useCopy();
  const [isPending, startTransition] = useTransition();
  const [chequeNumber, setChequeNumber] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [clearingDue, setClearingDue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !!chequeNumber.trim() &&
    !!bankAccountId &&
    !!amount &&
    Number(amount) > 0 &&
    !!recipientName.trim() &&
    !isPending;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await createOutgoingCheque({
          chequeNumber,
          bankAccountId,
          amount: Number(amount),
          recipientName,
          issueDate: issueDate || undefined,
          clearingDue: clearingDue || undefined,
        });
        setChequeNumber("");
        setAmount("");
        setRecipientName("");
        setIssueDate("");
        setClearingDue("");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label={t("cheques.fieldChequeNumber")}>
          <input className="input" data-testid="out-cheque-number" value={chequeNumber}
            onChange={(e) => setChequeNumber(e.target.value)} />
        </Field>
        <Field label={t("cheques.fieldBankAccount")}>
          <select className="input" data-testid="out-bank" value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}>
            <option value="">{t("cheques.selectBankPlaceholder")}</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
        </Field>
        <Field label={t("cheques.fieldAmount")}>
          <input className="input" data-testid="out-amount" inputMode="decimal" value={amount}
            onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label={t("cheques.fieldRecipient")}>
          <input className="input" data-testid="out-recipient" value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)} />
        </Field>
        <Field label={t("cheques.fieldIssueDate")}>
          <input type="date" className="input" data-testid="out-issue" value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)} />
        </Field>
        <Field label={t("cheques.fieldClearingDue")} hint={t("cheques.fieldClearingDueHint")}>
          <input type="date" className="input" data-testid="out-due" value={clearingDue}
            onChange={(e) => setClearingDue(e.target.value)} />
        </Field>
      </div>
      {error && <p className="text-sm text-neg">{error}</p>}
      <button onClick={submit} disabled={!canSubmit} data-testid="out-submit"
        className="rounded-lg px-4 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
        style={{ background: "var(--accent)" }}>
        {isPending ? t("cheques.submitSaving") : t("cheques.submitAdd")}
      </button>
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
