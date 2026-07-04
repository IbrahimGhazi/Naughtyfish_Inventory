"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { pkr, dateShort } from "@/lib/format";
import {
  getLedger,
  getParties,
  getInfo,
  getOutbox,
  cacheLedger,
  enqueue,
  flush,
} from "@/lib/offline/client";
import type { OfflineInfo } from "@/lib/offline/client";
import type { CachedLedger, OutboxItem } from "@/lib/offline/types";
import type { CreatePaymentInput } from "@/app/payments/actions";

const today = () => new Date().toISOString().slice(0, 10);

export default function FieldLedger() {
  const { partyId } = useParams<{ partyId: string }>();
  const [ledger, setLedger] = useState<CachedLedger | null>(null);
  const [partyName, setPartyName] = useState<string>("");
  const [info, setInfo] = useState<OfflineInfo | null>(null);
  const [pending, setPending] = useState<OutboxItem[]>([]);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const [led, nfo, ob, parties] = await Promise.all([
      getLedger(partyId),
      getInfo(),
      getOutbox(),
      getParties(),
    ]);
    setLedger(led ?? null);
    setInfo(nfo ?? null);
    setPending(ob.filter((o) => o.partyId === partyId));
    setPartyName(led?.partyName ?? parties.find((p) => p.id === partyId)?.name ?? "Customer");
  }, [partyId]);

  useEffect(() => {
    const refresh = () => void load();
    refresh();
    // Refresh from the server when possible, then reload the view.
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void cacheLedger(partyId).then(() => load());
    }
    window.addEventListener("nf:synced", refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.removeEventListener("nf:synced", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [partyId, load]);

  const pendingCredit = useMemo(
    () =>
      pending.reduce(
        (s, o) => s + (o.type === "payment" ? Number((o.payload as CreatePaymentInput).amount) || 0 : 0),
        0,
      ),
    [pending],
  );

  return (
    <div className="mx-auto max-w-[760px] space-y-4">
      <div>
        <Link href="/field" className="text-[12.5px] font-semibold text-muted hover:text-accent-deep">
          ‹ All customers
        </Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-[24px] font-semibold leading-tight text-ink">{partyName}</h1>
            <p className="mt-1 text-[12.5px] text-muted">
              {ledger
                ? `Balance as of ${new Date(ledger.syncedAt).toLocaleString()}`
                : "Not saved for offline — open this once while online."}
            </p>
          </div>
          <div className="text-right">
            <div
              className={`font-mono text-2xl font-semibold ${
                (ledger?.netOutstanding ?? 0) > 0 ? "text-neg" : "text-pos"
              }`}
            >
              {pkr(ledger?.netOutstanding ?? 0)}
            </div>
            {pendingCredit > 0 && (
              <div className="text-[11.5px] text-warn">−{pkr(pendingCredit)} pending sync</div>
            )}
          </div>
        </div>
      </div>

      {info?.canPay && (
        <div>
          {showForm ? (
            <PaymentForm
              partyId={partyId}
              partyName={partyName}
              entityId={info.entityId}
              onDone={async () => {
                setShowForm(false);
                await load();
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-on-accent"
              style={{ background: "var(--accent)" }}
            >
              Record payment
            </button>
          )}
        </div>
      )}

      {/* Pending (unsynced) payments for this customer */}
      {pending.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-hair bg-card">
          <div className="border-b border-hair2 bg-card2 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint2">
            Recorded here · waiting to sync
          </div>
          <ul className="divide-y divide-row">
            {pending.map((o) => (
              <li key={o.id} className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-[13px] text-text">{o.summary}</span>
                <span className="text-[11px] font-semibold text-warn">
                  {o.status === "failed" ? "retry" : "pending"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ledger snapshot */}
      <div className="overflow-hidden rounded-xl border border-hair bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="border-b border-hair2 bg-card2 text-left text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint2">
                <th className="px-3.5 py-2 font-semibold">Date</th>
                <th className="px-3.5 py-2 font-semibold">Detail</th>
                <th className="px-3.5 py-2 text-right font-semibold">Debit</th>
                <th className="px-3.5 py-2 text-right font-semibold">Credit</th>
                <th className="px-3.5 py-2 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {!ledger || ledger.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3.5 py-6 text-center text-sm text-faint">
                    {ledger ? "No activity." : "Nothing saved for this customer yet."}
                  </td>
                </tr>
              ) : (
                ledger.rows.map((r, i) => (
                  <tr key={i} className="border-b border-row">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-muted">{dateShort(r.date)}</td>
                    <td className="px-3.5 py-2.5 text-[12.5px] text-text">
                      <span className="font-semibold">{r.kind}</span> {r.ref}
                      {r.meta ? <span className="text-muted"> · {r.meta}</span> : null}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[12px] text-neg">
                      {r.debit ? pkr(r.debit) : ""}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[12px] text-pos">
                      {r.credit ? pkr(r.credit) : ""}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[12px] font-semibold text-ink">
                      {pkr(r.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- offline payment form --------------------------- */

function PaymentForm({
  partyId,
  partyName,
  entityId,
  onDone,
  onCancel,
}: {
  partyId: string;
  partyName: string;
  entityId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<"cash" | "transfer">("cash");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    const amt = Number(amount);
    if (!(amt > 0)) return setError("Enter an amount greater than zero.");
    if (type === "cash" && !note.trim())
      return setError("Cash payments need a note (recorded as proof).");

    setSaving(true);
    try {
      const payload: CreatePaymentInput = {
        partyId,
        type,
        amount: amt,
        date,
        note: note.trim() || undefined,
      };
      await enqueue("payment", payload, {
        entityId,
        partyId,
        partyName,
        summary: `${type === "cash" ? "Cash" : "Transfer"} payment · ${pkr(amt)}`,
      });
      // Try to sync immediately; if offline this silently no-ops until reconnect.
      void flush();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the payment.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-hair bg-card p-4">
      <div className="text-[13px] font-semibold text-ink">Record payment</div>

      <div className="flex gap-2">
        {(["cash", "transfer"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
              type === t ? "border-accent text-on-accent" : "border-hair bg-card text-muted hover:bg-card2"
            }`}
            style={type === t ? { background: "var(--accent)" } : undefined}
          >
            {t}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">Amount (Rs)</span>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input w-full"
          placeholder="0"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-full" />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
          Note {type === "cash" ? "(required)" : "(optional)"}
        </span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input w-full"
          placeholder={type === "cash" ? "e.g. cash collected at shop" : "optional"}
        />
      </label>

      {error && <p className="text-[12.5px] text-neg">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save payment"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-card2"
        >
          Cancel
        </button>
      </div>
      <p className="text-[11.5px] text-faint">
        Saved on this device and synced automatically when you&apos;re back online.
      </p>
    </div>
  );
}
