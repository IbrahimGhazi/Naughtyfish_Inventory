/**
 * Allowed values for the string-typed "enum" columns (kept as String for SQLite
 * portability — see prisma/schema.prisma). Validate against these in app code.
 */

export const BOOK_TYPES = ["white", "black"] as const;
export type BookType = (typeof BOOK_TYPES)[number];

export const ENTITY_NAMES = ["SeaStar", "NF"] as const;

export const ROLES = [
  "platform_admin",
  "admin",
  "accountant",
  "north_employee",
  "store_keeper",
  "delivery",
] as const;
export type Role = (typeof ROLES)[number];

/** Roles a CLIENT admin may assign from Settings → Users. platform_admin is
 *  the product owner's hidden role — it never appears in client-facing UIs. */
export const ASSIGNABLE_ROLES = [
  "admin",
  "accountant",
  "north_employee",
  "store_keeper",
  "delivery",
] as const;

export const ENTITY_ACCESS = ["cstar", "nf", "both"] as const;
export type EntityAccess = (typeof ENTITY_ACCESS)[number];

export const REGION_SCOPES = ["north", "south", "all"] as const;
export type RegionScope = (typeof REGION_SCOPES)[number];

export const PARTY_TYPES = ["customer", "supplier"] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const PARTY_SUBTYPES = ["corporate", "local"] as const;
export type PartySubType = (typeof PARTY_SUBTYPES)[number];

export const CHANNELS = ["north", "local"] as const;
export type Channel = (typeof CHANNELS)[number];

export const ITEM_CATEGORIES = ["fish_fillet", "prawn"] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const CHEQUE_DIRECTIONS = ["incoming", "outgoing"] as const;
export const CHEQUE_STATUSES = ["issued", "cleared", "pending", "held", "bounced"] as const;

export const INVOICE_STATUSES = ["draft", "submitted", "edited", "printed"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_TYPES = ["cheque", "transfer", "cash"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const BAD_DEBT_SUBCATEGORIES = ["bad_debt", "dispute"] as const;

export const STORE_OWNERSHIP = ["own", "rented"] as const;

export const PROCESS_STATUSES = ["planned", "in_progress", "completed", "cancelled"] as const;
export type ProcessStatus = (typeof PROCESS_STATUSES)[number];
