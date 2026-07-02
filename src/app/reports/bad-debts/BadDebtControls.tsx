"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pkr } from "@/lib/format";
import { useCopy } from "@/lib/copy/CopyProvider";
import { createBadDebt, deleteBadDebt } from "./actions";
import type { BadDebtSubCategory } from "./summary";

export interface FormParty {
  id: string;
  name: string;
  partyType: string;
}

export interface FormInvoice {
  id: string;
  invoiceNumber: number;
  partyId: string;
  partyName: string;
  amount: number;
}

/** Local YYYY-MM-DD for the date input (avoids UTC off-by-one from toISOString). */
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AddBadDebtForm({
  parties,
  invoices,
}: {
  parties: FormParty[];
  invoices: FormInvoice[];
}) {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [subCategory, setSubCategory] = useState<BadDebtSubCategory>("bad_debt");
  const [amount, setAmount] = useState("");
  const [partyId, setPartyId] = useState("");
  const [personName, setPersonName] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const selectedParty = parties.find((p) => p.id === partyId) ?? null;

  // When a party is selected, prefer that party's invoices; otherwise show all.
  const invoiceOptions = useMemo(() => {
    if (!partyId) return invoices;
    const own = invoices.filter((i) => i.partyId === partyId);
    return own.length > 0 ? own : invoices;
  }, [partyId, invoices]);

  // Person name is required only when no party is selected.
  const nameOk = !!partyId || personName.trim().length > 0;
  const canSubmit = !!amount && Number(amount) > 0 && nameOk && !isPending;

  function resetInvoiceIfMismatched(nextPartyId: string) {
    if (!nextPartyId || !invoiceId) return;
    const inv = invoices.find((i) => i.id === invoiceId);
    if (inv && inv.partyId !== nextPartyId) setInvoiceId("");
  }

  function submit() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await createBadDebt({
          subCategory,
          amount: Number(amount),
          personName: personName.trim() || undefined,
          partyId: partyId || undefined,
          invoiceId: invoiceId || undefined,
          note: note.trim() || undefined,
          date: date || undefined,
        });
        // Reset the entry fields but keep the panel open for rapid entry.
        setAmount("");
        setPartyId("");
        setPersonName("");
        setInvoiceId("");
        setNote("");
        setDate(todayLocal());
        setOk(true);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        data-testid="bd-open-add"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors"
        style={{ background: "var(--accent)" }}
      >
        {t("reports.badDebts.addEntry")}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-hair bg-card p-[18px]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-[17px] font-semibold text-ink">{t("reports.badDebts.form.title")}</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-faint hover:text-text"
        >
          {t("reports.badDebts.form.close")}
        </button>
      </div>

      {/* Sub-category toggle */}
      <div className="mb-3">
        <span className="mb-1 block text-xs font-medium text-faint2">{t("reports.badDebts.form.type")}</span>
        <div className="inline-flex overflow-hidden rounded-lg border border-hair" data-testid="bd-subcategory">
          <button
            type="button"
            data-testid="bd-subcategory-bad_debt"
            onClick={() => setSubCategory("bad_debt")}
            className="px-3 py-1.5 text-sm font-semibold transition-colors"
            style={
              subCategory === "bad_debt"
                ? { background: "var(--neg)", color: "var(--card)" }
                : { background: "var(--card)", color: "var(--muted)" }
            }
          >
            {t("reports.badDebts.form.toggleBadDebt")}
          </button>
          <button
            type="button"
            data-testid="bd-subcategory-dispute"
            onClick={() => setSubCategory("dispute")}
            className="px-3 py-1.5 text-sm font-semibold transition-colors"
            style={
              subCategory === "dispute"
                ? { background: "var(--warn)", color: "var(--card)" }
                : { background: "var(--card)", color: "var(--muted)" }
            }
          >
            {t("reports.badDebts.form.toggleDispute")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label={t("reports.badDebts.form.amount")}>
          <input
            className="input"
            data-testid="bd-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        <Field label={t("reports.badDebts.form.party")} hint={t("reports.badDebts.form.partyHint")}>
          <select
            className="input"
            data-testid="bd-party"
            value={partyId}
            onChange={(e) => {
              const next = e.target.value;
              resetInvoiceIfMismatched(next);
              setPartyId(next);
            }}
          >
            <option value="">{t("reports.badDebts.form.partyFreeText")}</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.partyType === "supplier" ? t("reports.badDebts.form.partySupplierSuffix") : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={t("reports.badDebts.form.personName")}
          hint={selectedParty ? `using ${selectedParty.name}` : t("reports.badDebts.form.personNameHint")}
        >
          <input
            className="input"
            data-testid="bd-person"
            placeholder={selectedParty ? selectedParty.name : t("reports.badDebts.form.personNamePlaceholder")}
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
          />
        </Field>

        <Field label={t("reports.badDebts.form.invoice")} hint={t("reports.badDebts.form.invoiceHint")}>
          <select
            className="input"
            data-testid="bd-invoice"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
          >
            <option value="">{t("reports.badDebts.form.invoiceNone")}</option>
            {invoiceOptions.map((i) => (
              <option key={i.id} value={i.id}>
                #{i.invoiceNumber} · {i.partyName} · {pkr(i.amount)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("reports.badDebts.form.date")}>
          <div className="flex gap-2">
            <input
              type="date"
              className="input"
              data-testid="bd-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              type="button"
              data-testid="bd-today"
              onClick={() => setDate(todayLocal())}
              className="shrink-0 rounded-lg border border-hair bg-card px-2 text-xs font-semibold text-muted transition-colors hover:bg-card2"
            >
              {t("reports.badDebts.form.today")}
            </button>
          </div>
        </Field>

        <Field label={t("reports.badDebts.form.note")} hint={t("reports.badDebts.form.noteHint")}>
          <input
            className="input"
            data-testid="bd-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={!canSubmit}
          data-testid="bd-submit"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? t("reports.badDebts.form.saving") : t("reports.badDebts.form.submit")}
        </button>
        {ok && <span className="text-xs font-semibold text-pos">{t("reports.badDebts.form.saved")}</span>}
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

/** Per-row delete button (ledger corrections are deletable). */
export function DeleteBadDebtButton({ id }: { id: string }) {
  const t = useCopy();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function del() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteBadDebt({ id });
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        data-testid={`bd-delete-${id}`}
        onClick={del}
        disabled={isPending}
        title={t("reports.badDebts.delete.title")}
        className="rounded px-2 py-1 text-xs font-semibold text-neg transition-colors hover:bg-card2 disabled:opacity-40"
      >
        {isPending ? "…" : t("reports.badDebts.delete.label")}
      </button>
      {error && <span className="text-xs text-neg">{error}</span>}
    </span>
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
