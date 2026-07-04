"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getParties,
  getInfo,
  getOutbox,
  hydrate,
  cacheLedger,
  flush,
} from "@/lib/offline/client";
import type { OfflineInfo } from "@/lib/offline/client";
import { useOnline } from "@/lib/offline/useOnline";
import type { CachedParty, OutboxItem } from "@/lib/offline/types";

/*
 * Field mode — the offline-capable workspace. Reads everything from the
 * IndexedDB cache so it works with no signal; writes go to the outbox and sync
 * on reconnect. First visit must be online (to cache the page + pull data).
 */
export default function FieldHome() {
  const [parties, setParties] = useState<CachedParty[]>([]);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [info, setInfoState] = useState<OfflineInfo | null>(null);
  const [q, setQ] = useState("");
  const online = useOnline();
  const [busy, setBusy] = useState<null | "save" | "sync">(null);

  const load = useCallback(async () => {
    const [ps, ob, nfo] = await Promise.all([getParties(), getOutbox(), getInfo()]);
    setParties(ps);
    setOutbox(ob);
    setInfoState(nfo ?? null);
  }, []);

  useEffect(() => {
    const refresh = () => void load();
    refresh();
    window.addEventListener("nf:synced", refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.removeEventListener("nf:synced", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? parties.filter((p) => p.name.toLowerCase().includes(s)) : parties;
  }, [q, parties]);

  const saveAll = async () => {
    setBusy("save");
    try {
      await hydrate();
      // Warm the hub's page shell (document + RSC) so it opens offline.
      await Promise.allSettled([
        fetch("/field", { headers: { Accept: "text/html" }, cache: "no-store" }),
        fetch("/field", { headers: { RSC: "1" }, cache: "no-store" }),
      ]);
      const ps = await getParties();
      for (const p of ps) {
        await cacheLedger(p.id); // one at a time — gentle on the API
        // Warm each customer's page shell so their ledger opens offline.
        await fetch(`/field/${p.id}`, { headers: { Accept: "text/html" }, cache: "no-store" }).catch(
          () => {},
        );
      }
      await load();
    } finally {
      setBusy(null);
    }
  };

  const syncNow = async () => {
    setBusy("sync");
    try {
      await flush();
      await load();
    } finally {
      setBusy(null);
    }
  };

  const savedLabel = info?.serverTime
    ? new Date(info.serverTime).toLocaleString()
    : null;

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
            Offline field mode
          </div>
          <h1 className="mt-0.5 font-serif text-[26px] font-semibold leading-tight text-ink">
            Field
          </h1>
          <p className="mt-1 text-sm text-muted">
            Look up a customer&apos;s ledger and record payments even with no signal.
            {savedLabel ? ` Saved for offline: ${savedLabel}.` : " Not saved for offline yet."}
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={!online || busy !== null}
          className="rounded-lg border border-hair bg-card px-3.5 py-2 text-sm font-semibold text-text transition-colors hover:bg-card2 disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Save all for offline"}
        </button>
      </div>

      {/* Pending sync queue */}
      {outbox.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-hair bg-card">
          <div className="flex items-center justify-between border-b border-hair2 bg-card2 px-3.5 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint2">
              Waiting to sync · {outbox.length}
            </span>
            <button
              onClick={syncNow}
              disabled={!online || busy !== null}
              className="rounded-md border border-hair bg-card px-2.5 py-1 text-[12px] font-semibold text-text transition-colors hover:bg-card2 disabled:opacity-50"
            >
              {busy === "sync" ? "Syncing…" : online ? "Sync now" : "Offline"}
            </button>
          </div>
          <ul className="divide-y divide-row">
            {outbox.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-text">{o.partyName}</div>
                  <div className="truncate text-[12px] text-muted">{o.summary}</div>
                  {o.status === "failed" && o.lastError && (
                    <div className="truncate text-[11px] text-neg">Failed: {o.lastError}</div>
                  )}
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
                  style={{
                    background: o.status === "failed" ? "var(--neg)" : "var(--warn)",
                    color: "#1a1200",
                  }}
                >
                  {o.status === "failed" ? "retry" : "pending"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Party search + list */}
      <div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customers…"
          className="input w-full"
        />
      </div>

      {parties.length === 0 ? (
        <p className="rounded-xl border border-hair bg-card px-4 py-8 text-center text-sm text-faint">
          {online
            ? "Tap “Save all for offline” to cache your customers and their ledgers."
            : "Nothing saved for offline yet. Reconnect once and tap “Save all for offline.”"}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-hair bg-card">
          <ul className="divide-y divide-row">
            {filtered.map((p) => (
              <li key={p.id}>
                <a
                  href={`/field/${p.id}`}
                  className="flex items-center justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-card2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-ink">{p.name}</div>
                    <div className="truncate text-[11.5px] text-faint">
                      {[p.partyType, p.subType, p.channel].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <span className="shrink-0 text-faint">›</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
