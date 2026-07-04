/*
 * Offline/field client engine (browser-only). Orchestrates the IndexedDB cache
 * (db.ts), the read endpoints, and the queued-write sync via the existing
 * server actions. Import only from client components.
 */
import { createPayment, type CreatePaymentInput } from "@/app/payments/actions";
import { createInvoice, type CreateInvoiceInput } from "@/app/invoices/actions";
import * as db from "./db";
import type { Bootstrap, CachedLedger, OutboxItem, OutboxType } from "./types";

/** Scalar bootstrap info kept in the `meta` store (arrays live in their own stores). */
export interface OfflineInfo {
  serverTime: string;
  entityId: string;
  entityName: string;
  userId: string;
  userRole: string;
  canInvoice: boolean;
  canPay: boolean;
  referenceRegions: string[];
}

const BOOTSTRAP_URL = "/api/offline/bootstrap";
const ledgerUrl = (id: string) => `/api/offline/ledger/${encodeURIComponent(id)}`;

/** Fetch JSON, returning null on any failure (offline, redirect-to-login, non-2xx). */
async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") || "").includes("application/json")) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

/* ------------------------------ reads / cache ------------------------------ */

/** Pull the reference bundle while online and refresh already-cached ledgers. */
export async function hydrate(): Promise<boolean> {
  const boot = await fetchJson<Bootstrap>(BOOTSTRAP_URL);
  if (!boot) return false;

  const info: OfflineInfo = {
    serverTime: boot.serverTime,
    entityId: boot.entityId,
    entityName: boot.entityName,
    userId: boot.userId,
    userRole: boot.userRole,
    canInvoice: boot.canInvoice,
    canPay: boot.canPay,
    referenceRegions: boot.referenceRegions,
  };

  await Promise.all([
    db.putParties(boot.parties),
    db.putItems(boot.items),
    db.putStores(boot.stores),
    db.setMeta("bootstrap", info),
  ]);

  const ids = await db.getCachedLedgerPartyIds();
  await Promise.all(ids.map((id) => cacheLedger(id)));
  return true;
}

/** Fetch + cache one party's ledger (called when a ledger is opened online). */
export async function cacheLedger(partyId: string): Promise<CachedLedger | null> {
  const led = await fetchJson<CachedLedger>(ledgerUrl(partyId));
  if (led) await db.putLedger(led);
  return led;
}

export const getParties = db.getParties;
export const getItems = db.getItems;
export const getStores = db.getStores;
export const getLedger = db.getLedger;
export const getOutbox = db.getOutbox;
export const countPending = db.countPendingOutbox;
export const clearAll = db.clearAll;
export const getInfo = () => db.getMeta<OfflineInfo>("bootstrap");

/* --------------------------------- writes --------------------------------- */

export async function enqueue(
  type: OutboxType,
  payload: CreatePaymentInput | CreateInvoiceInput,
  meta: { entityId: string; partyId: string; partyName: string; summary: string },
): Promise<OutboxItem> {
  const item: OutboxItem = {
    id: uuid(),
    type,
    status: "pending",
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    entityId: meta.entityId,
    partyId: meta.partyId,
    partyName: meta.partyName,
    summary: meta.summary,
    payload,
  };
  await db.addOutbox(item);
  return item;
}

let flushing = false;

/**
 * Replay every queued write against the server. Idempotent: the queue id IS the
 * server row id, so a re-run of an already-synced item is a safe no-op. Invoices
 * flush before payments (a payment may reference an invoice made offline on the
 * same trip). Fires `nf:synced` with the count so the toast can announce it.
 */
export async function flush(): Promise<number> {
  if (flushing) return 0;
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;

  flushing = true;
  let synced = 0;
  try {
    const all = await db.getOutbox();
    const ordered = [
      ...all.filter((i) => i.type === "invoice"),
      ...all.filter((i) => i.type === "payment"),
    ];

    for (const item of ordered) {
      item.status = "syncing";
      item.lastError = null;
      await db.updateOutbox(item);
      try {
        if (item.type === "payment") {
          await createPayment(item.payload as CreatePaymentInput, item.id);
        } else {
          await createInvoice(item.payload as CreateInvoiceInput, item.id);
        }
        await db.deleteOutbox(item.id);
        synced++;
      } catch (err) {
        item.status = "failed";
        item.attempts += 1;
        item.lastError = err instanceof Error ? err.message : String(err);
        await db.updateOutbox(item);
      }
    }

    if (synced > 0) {
      const ids = await db.getCachedLedgerPartyIds();
      await Promise.all(ids.map((id) => cacheLedger(id)));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nf:synced", { detail: { count: synced } }));
      }
    }
  } finally {
    flushing = false;
  }
  return synced;
}
