/*
 * IndexedDB wrapper for the offline/field layer (browser-only — never import
 * from a server component). Uses idb for a small, well-tested Promise surface.
 *
 * Stores:
 *   meta     — key/value (bootstrap timestamp, current user/entity)
 *   parties  — cached party directory (keyed by id)
 *   items    — cached items for invoice entry (keyed by id)
 *   stores   — cached source stores (keyed by id)
 *   ledgers  — per-party ledger snapshots (keyed by partyId)
 *   outbox   — queued offline writes (keyed by client UUID), indexed by status
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  CachedParty,
  CachedItem,
  CachedStore,
  CachedLedger,
  CachedPartyInvoices,
  OutboxItem,
} from "./types";

interface NfDB extends DBSchema {
  meta: { key: string; value: unknown };
  parties: { key: string; value: CachedParty };
  items: { key: string; value: CachedItem };
  stores: { key: string; value: CachedStore };
  ledgers: { key: string; value: CachedLedger };
  invoices: { key: string; value: CachedPartyInvoices };
  outbox: { key: string; value: OutboxItem; indexes: { "by-status": OutboxItem["status"] } };
}

let dbPromise: Promise<IDBPDatabase<NfDB>> | null = null;

function getDb(): Promise<IDBPDatabase<NfDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable (server or unsupported browser)."));
  }
  if (!dbPromise) {
    // v2 adds the "invoices" store. The upgrade is guarded by oldVersion so
    // existing v1 clients only get the new store, not a re-create of the rest.
    dbPromise = openDB<NfDB>("naughtyfish", 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("meta");
          db.createObjectStore("parties", { keyPath: "id" });
          db.createObjectStore("items", { keyPath: "id" });
          db.createObjectStore("stores", { keyPath: "id" });
          db.createObjectStore("ledgers", { keyPath: "partyId" });
          const outbox = db.createObjectStore("outbox", { keyPath: "id" });
          outbox.createIndex("by-status", "status");
        }
        if (oldVersion < 2) {
          db.createObjectStore("invoices", { keyPath: "partyId" });
        }
      },
    });
  }
  return dbPromise;
}

/* ------------------------------- meta ------------------------------- */

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put("meta", value, key);
}

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get("meta", key)) as T | undefined;
}

/* --------------------- reference data (bulk replace) --------------------- */

/** Replace a whole keyPath store's contents in one transaction. */
async function replaceStore<K extends "parties" | "items" | "stores">(
  name: K,
  rows: NfDB[K]["value"][],
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(name, "readwrite");
  await tx.store.clear();
  for (const row of rows) await tx.store.put(row);
  await tx.done;
}

export const putParties = (rows: CachedParty[]) => replaceStore("parties", rows);
export const putItems = (rows: CachedItem[]) => replaceStore("items", rows);
export const putStores = (rows: CachedStore[]) => replaceStore("stores", rows);

export async function getParties(): Promise<CachedParty[]> {
  const db = await getDb();
  return db.getAll("parties");
}
export async function getItems(): Promise<CachedItem[]> {
  const db = await getDb();
  return db.getAll("items");
}
export async function getStores(): Promise<CachedStore[]> {
  const db = await getDb();
  return db.getAll("stores");
}

/* ------------------------------ ledgers ------------------------------ */

export async function putLedger(ledger: CachedLedger): Promise<void> {
  const db = await getDb();
  await db.put("ledgers", ledger);
}
export async function getLedger(partyId: string): Promise<CachedLedger | undefined> {
  const db = await getDb();
  return db.get("ledgers", partyId);
}
export async function getCachedLedgerPartyIds(): Promise<string[]> {
  const db = await getDb();
  return db.getAllKeys("ledgers") as Promise<string[]>;
}

/* ------------------------------ invoices ------------------------------ */

export async function putInvoices(rec: CachedPartyInvoices): Promise<void> {
  const db = await getDb();
  await db.put("invoices", rec);
}
export async function getInvoices(partyId: string): Promise<CachedPartyInvoices | undefined> {
  const db = await getDb();
  return db.get("invoices", partyId);
}
export async function getCachedInvoicePartyIds(): Promise<string[]> {
  const db = await getDb();
  return db.getAllKeys("invoices") as Promise<string[]>;
}

/* ------------------------------ outbox ------------------------------ */

export async function addOutbox(item: OutboxItem): Promise<void> {
  const db = await getDb();
  await db.put("outbox", item);
}
export async function updateOutbox(item: OutboxItem): Promise<void> {
  const db = await getDb();
  await db.put("outbox", item);
}
export async function deleteOutbox(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("outbox", id);
}
export async function getOutbox(): Promise<OutboxItem[]> {
  const db = await getDb();
  const all = await db.getAll("outbox");
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function countPendingOutbox(): Promise<number> {
  const db = await getDb();
  const pending = await db.countFromIndex("outbox", "by-status", "pending");
  const failed = await db.countFromIndex("outbox", "by-status", "failed");
  return pending + failed;
}

/** Wipe everything (call on logout so a shared device leaks nothing). */
export async function clearAll(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    ["meta", "parties", "items", "stores", "ledgers", "invoices", "outbox"],
    "readwrite",
  );
  await Promise.all([
    tx.objectStore("meta").clear(),
    tx.objectStore("parties").clear(),
    tx.objectStore("items").clear(),
    tx.objectStore("stores").clear(),
    tx.objectStore("ledgers").clear(),
    tx.objectStore("invoices").clear(),
    tx.objectStore("outbox").clear(),
  ]);
  await tx.done;
}
