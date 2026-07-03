"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pkr, dateShort } from "@/lib/format";
import { useCopy } from "@/lib/copy/CopyProvider";
import { createPayment } from "@/app/payments/actions";

export interface FormInvoice {
  id: string;
  invoiceNumber: number;
  referenceNumber: string | null;
  date: string;
  total: number;
  outstanding: number;
}
export interface FormPurchase {
  id: string;
  reference: string;
  supplierBillNo: string | null;
  date: string;
  total: number;
  outstanding: number;
}
export interface FormBank {
  id: string;
  label: string;
}

type PayType = "cash" | "transfer" | "cheque";

export default function PaymentForm({
  partyId,
  invoices,
  banks,
  purchases = [],
  isSupplier = false,
  defaultPurchaseId = "",
}: {
  partyId: string;
  invoices: FormInvoice[];
  banks: FormBank[];
  /** Supplier mode: open purchases to settle instead of invoices. */
  purchases?: FormPurchase[];
  isSupplier?: boolean;
  defaultPurchaseId?: string;
}) {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<PayType>("transfer");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [purchaseId, setPurchaseId] = useState(defaultPurchaseId);
  const [note, setNote] = useState("");
  const [promiseOfCheque, setPromiseOfCheque] = useState(false);
  const [isPrecautionaryCash, setIsPrecautionaryCash] = useState(false);
  const [chequeNumber, setChequeNumber] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [clearingDue, setClearingDue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cashNoteMissing = type === "cash" && !note.trim();
  const chequeFieldsMissing = type === "cheque" && (!chequeNumber.trim() || !bankAccountId);

  const canSubmit =
    !!amount &&
    Number(amount) > 0 &&
    !cashNoteMissing &&
    !chequeFieldsMissing &&
    !isPending;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await createPayment({
          partyId,
          type,
          amount: Number(amount),
          date: date || undefined,
          invoiceId: isSupplier ? undefined : invoiceId || undefined,
          purchaseId: isSupplier ? purchaseId || undefined : undefined,
          note: note || undefined,
          promiseOfCheque: type === "cash" ? promiseOfCheque : undefined,
          isPrecautionaryCash: type === "cash" ? isPrecautionaryCash : undefined,
          chequeNumber: type === "cheque" ? chequeNumber : undefined,
          bankAccountId: type === "cheque" ? bankAccountId : undefined,
          issueDate: type === "cheque" ? issueDate || undefined : undefined,
          clearingDue: type === "cheque" ? clearingDue || undefined : undefined,
        });
        router.push(`/parties/${partyId}`);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-hair bg-card p-[18px] sm:grid-cols-2">
        <Field label={t("parties.form.paymentType")}>
          <div className="flex gap-2">
            {(["cash", "transfer", "cheque"] as PayType[]).map((pt) => (
              <button
                key={pt}
                type="button"
                data-testid={`type-${pt}`}
                onClick={() => setType(pt)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold capitalize transition-colors ${
                  type === pt
                    ? "border-transparent text-on-accent"
                    : "border-hair bg-card text-text hover:bg-card2"
                }`}
                style={type === pt ? { background: "var(--accent)" } : undefined}
              >
                {pt}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("parties.form.amount")}>
          <input
            className="input"
            data-testid="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label={t("parties.form.date")} hint={t("parties.form.dateHint")}>
          <input
            type="date"
            className="input"
            data-testid="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        {isSupplier ? (
          <Field label={t("purchases.pay.against")}>
            <select
              className="input"
              data-testid="purchase"
              value={purchaseId}
              onChange={(e) => setPurchaseId(e.target.value)}
            >
              <option value="">{t("purchases.pay.general")}</option>
              {purchases.map((pur) => (
                <option key={pur.id} value={pur.id}>
                  {pur.reference}
                  {pur.supplierBillNo ? ` · ${pur.supplierBillNo}` : ""} · {dateShort(pur.date)} · {t("purchases.pay.duePrefix")} {pkr(pur.outstanding)}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label={t("parties.form.againstInvoice")}>
            <select
              className="input"
              data-testid="invoice"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
            >
              <option value="">{t("parties.form.notLinked")}</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  #{inv.invoiceNumber}
                  {inv.referenceNumber ? ` · ${inv.referenceNumber}` : ""} · {dateShort(inv.date)} · {t("parties.form.outstanding")} {pkr(inv.outstanding)}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {/* Cash proof flags (the tape: cash recorded "ehtiyaatan") */}
      {type === "cash" && (
        <div className="space-y-3 rounded-xl border border-hair bg-card p-[18px]">
          <Field label={t("parties.form.noteRequiredCash")} hint={t("parties.form.noteRequiredCashHint")}>
            <input
              className="input"
              data-testid="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              data-testid="precautionary"
              checked={isPrecautionaryCash}
              onChange={(e) => setIsPrecautionaryCash(e.target.checked)}
            />
            {t("parties.form.precautionaryCash")}
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              data-testid="promise"
              checked={promiseOfCheque}
              onChange={(e) => setPromiseOfCheque(e.target.checked)}
            />
            {t("parties.form.promiseOfCheque")}
          </label>
        </div>
      )}

      {/* Note for non-cash types (optional) */}
      {type !== "cash" && (
        <div className="rounded-xl border border-hair bg-card p-[18px]">
          <Field label={t("parties.form.noteOptional")}>
            <input
              className="input"
              data-testid="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* Cheque fields */}
      {type === "cheque" && (
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-hair bg-card p-[18px] sm:grid-cols-2">
          <Field label={t("parties.form.chequeNumber")}>
            <input
              className="input"
              data-testid="cheque-number"
              value={chequeNumber}
              onChange={(e) => setChequeNumber(e.target.value)}
            />
          </Field>
          <Field label={t("parties.form.bankAccount")}>
            <select
              className="input"
              data-testid="bank-account"
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
            >
              <option value="">{t("parties.form.selectBank")}</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("parties.form.issueDate")}>
            <input
              type="date"
              className="input"
              data-testid="issue-date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </Field>
          <Field label={t("parties.form.clearingDue")} hint={t("parties.form.clearingDueHint")}>
            <input
              type="date"
              className="input"
              data-testid="clearing-due"
              value={clearingDue}
              onChange={(e) => setClearingDue(e.target.value)}
            />
          </Field>
        </div>
      )}

      {error && <p className="text-sm text-neg">{error}</p>}

      <button
        onClick={submit}
        disabled={!canSubmit}
        data-testid="submit-payment"
        className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
        style={{ background: "var(--accent)" }}
      >
        {isPending ? t("parties.form.recording") : t("parties.form.submit")}
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-faint2">
        {label}
        {hint && <span className="ml-1 font-normal text-faint">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}
