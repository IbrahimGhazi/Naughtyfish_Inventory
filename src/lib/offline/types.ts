/*
 * Shared types for the offline / field layer. Everything here is plain
 * JSON-serializable data: it crosses the wire (bootstrap + ledger endpoints)
 * and lives in IndexedDB, so no Date/Decimal — ISO strings + numbers only.
 */

export interface CachedParty {
  id: string;
  name: string;
  partyType: string; // "customer" | "supplier" | ...
  subType: string | null;
  channel: string | null;
  ntn: string | null;
}

export interface CachedItem {
  id: string;
  name: string;
  isPrawn: boolean;
}

export interface CachedStore {
  id: string;
  name: string;
}

export interface CachedLedgerRow {
  date: string; // ISO
  kind: "invoice" | "payment" | "purchase";
  ref: string;
  debit: number;
  credit: number;
  balance: number;
  meta?: string;
}

export interface CachedLedger {
  partyId: string;
  partyName: string;
  syncedAt: string; // ISO — when this snapshot was fetched from the server
  opening: number;
  netOutstanding: number;
  rows: CachedLedgerRow[];
}

/** One-shot reference data pulled while online so the field surface works offline. */
export interface Bootstrap {
  serverTime: string;
  entityId: string;
  entityName: string;
  userId: string;
  userRole: string;
  canInvoice: boolean;
  canPay: boolean;
  parties: CachedParty[];
  items: CachedItem[];
  stores: CachedStore[];
  referenceRegions: string[];
}

export type OutboxType = "payment" | "invoice";
export type OutboxStatus = "pending" | "syncing" | "failed";

/**
 * A queued write. `id` is a client-generated UUID that doubles as the server
 * row's primary key — replaying a sync therefore hits the unique PK and is a
 * safe no-op (idempotency without any schema change). `payload` is the exact
 * input the matching server action expects.
 */
export interface OutboxItem {
  id: string;
  type: OutboxType;
  status: OutboxStatus;
  createdAt: string; // ISO
  attempts: number;
  lastError: string | null;
  entityId: string;
  // Display-only summary so the pending list renders without decoding payload.
  partyId: string;
  partyName: string;
  summary: string; // e.g. "Cash payment · Rs 12,000" or "Invoice · Rs 84,300"
  payload: unknown;
}
