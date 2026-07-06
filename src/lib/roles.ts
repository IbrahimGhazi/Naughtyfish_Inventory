/**
 * Role → page/action access. Two layers:
 *
 *  1. STATIC built-in matrix (ROLE_PAGES / canAccessPage) — the original
 *     hardcoded roles, used as a FALLBACK when the DB Role row is missing (e.g.
 *     before the migration runs) and by the unit tests.
 *  2. DYNAMIC per-role permissions (Role table, JSON pageKey -> none|view|edit)
 *     resolved at session time onto ctx.user.perms. requirePage() + canView/
 *     canEdit read this, so CUSTOM roles and per-tab view/edit work app-wide.
 *
 * UI hiding is NOT enforcement: pages still call requirePage() server-side and
 * sensitive actions still guard (assertRole / requireEdit). The delivery role
 * gets its own restricted portal (/delivery).
 */
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import type { ActiveContext } from "./session";

export type PageKey =
  | "dashboard"
  | "invoices"
  | "purchases"
  | "parties"
  | "shipments"
  | "inventory"
  | "processes"
  | "cheques"
  | "banks"
  | "expenses"
  | "reports"
  | "settings"
  | "platform"
  | "delivery";

export type PermLevel = "none" | "view" | "edit";

/** Client pages exposed in the role builder (platform + delivery are special). */
export const BUILDER_PAGES: PageKey[] = [
  "dashboard", "invoices", "purchases", "parties", "shipments", "inventory",
  "processes", "cheques", "banks", "expenses", "reports", "settings",
];

export const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: "Dashboard",
  invoices: "Invoices",
  purchases: "Purchases",
  parties: "Customers & suppliers",
  shipments: "Shipments",
  inventory: "Inventory",
  processes: "Processes",
  cheques: "Cheques",
  banks: "Banks",
  expenses: "Expenses",
  reports: "Reports",
  settings: "Settings",
  platform: "Platform",
  delivery: "Delivery",
};

const ALL_CLIENT_PAGES: PageKey[] = [...BUILDER_PAGES];

/** Original hardcoded role → pages matrix (the fallback + built-in defaults). */
const ROLE_PAGES: Record<string, PageKey[]> = {
  platform_admin: [...ALL_CLIENT_PAGES, "platform", "delivery"],
  admin: ALL_CLIENT_PAGES,
  accountant: ALL_CLIENT_PAGES.filter((p) => p !== "settings"),
  north_employee: ["dashboard", "invoices", "parties", "shipments", "inventory"],
  store_keeper: ["dashboard", "inventory", "shipments", "processes"],
  delivery: ["delivery"],
};

const ROLE_DISPLAY: Record<string, string> = {
  platform_admin: "Platform admin",
  admin: "Admin",
  accountant: "Accountant",
  north_employee: "North employee",
  store_keeper: "Store keeper",
  delivery: "Delivery",
};

export interface RoleDef {
  key: string;
  name: string;
  isSystem: boolean;
  permissions: Record<string, PermLevel>;
}

/** Build a perms map from a page list — every listed page defaults to "edit"
 *  (the built-in roles historically had full access to pages they could open). */
function permsFromPages(pages: PageKey[]): Record<string, PermLevel> {
  const out: Record<string, PermLevel> = {};
  for (const p of pages) out[p] = "edit";
  return out;
}

/** The built-in roles as RoleDefs (source of truth when no DB override exists). */
export const BUILTIN_ROLES: Record<string, RoleDef> = Object.fromEntries(
  Object.entries(ROLE_PAGES).map(([key, pages]) => [
    key,
    { key, name: ROLE_DISPLAY[key] ?? key, isSystem: true, permissions: permsFromPages(pages) },
  ]),
);

/* ------------------------------- static layer ------------------------------- */

/** STATIC built-in check (fallback + tests). Does NOT see DB overrides. */
export function canAccessPage(role: string, page: PageKey): boolean {
  return (ROLE_PAGES[role] ?? []).includes(page);
}

/** Where a role lands after login / after a blocked navigation. */
export function roleHome(role: string): string {
  return role === "delivery" ? "/delivery" : "/";
}

/* ------------------------------ dynamic layer ------------------------------ */

export function levelOf(perms: Record<string, PermLevel> | undefined, page: PageKey): PermLevel {
  return perms?.[page] ?? "none";
}
export function hasView(perms: Record<string, PermLevel> | undefined, page: PageKey): boolean {
  const l = levelOf(perms, page);
  return l === "view" || l === "edit";
}
export function hasEdit(perms: Record<string, PermLevel> | undefined, page: PageKey): boolean {
  return levelOf(perms, page) === "edit";
}

/** Resolve a role key's permissions: DB Role row (JSON) if present, else the
 *  built-in default, else empty. Tolerant of the Role table not existing yet. */
export async function resolvePerms(roleKey: string): Promise<Record<string, PermLevel>> {
  try {
    const row = await prisma.role.findUnique({ where: { key: roleKey } });
    if (row) {
      const parsed = JSON.parse(row.permissions) as Record<string, PermLevel>;
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    // Role table may not exist yet (pre-migration) — fall through to built-in.
  }
  return BUILTIN_ROLES[roleKey]?.permissions ?? {};
}

/** True when the key is a built-in role or an existing custom Role row — used
 *  to validate a user.role assignment now that custom roles exist (the static
 *  ROLES enum can no longer be the source of truth). */
export async function isValidRoleKey(key: string): Promise<boolean> {
  if (BUILTIN_ROLES[key]) return true;
  try {
    const row = await prisma.role.findUnique({ where: { key } });
    return !!row;
  } catch {
    return false;
  }
}

/** All roles for the builder UI: built-ins overlaid with DB overrides/custom. */
export async function getAllRoles(): Promise<RoleDef[]> {
  let rows: { key: string; name: string; permissions: string; isSystem: boolean }[] = [];
  try {
    rows = await prisma.role.findMany({ orderBy: { createdAt: "asc" } });
  } catch {
    rows = [];
  }
  const byKey = new Map<string, RoleDef>();
  // Base: built-ins (minus platform_admin, which is the hidden operator role).
  for (const [key, def] of Object.entries(BUILTIN_ROLES)) {
    if (key === "platform_admin") continue;
    byKey.set(key, { ...def, permissions: { ...def.permissions } });
  }
  // Overlay DB rows (override built-in perms, add custom roles).
  for (const r of rows) {
    if (r.key === "platform_admin") continue;
    let perms: Record<string, PermLevel> = {};
    try {
      perms = JSON.parse(r.permissions) as Record<string, PermLevel>;
    } catch {
      perms = {};
    }
    const builtin = BUILTIN_ROLES[r.key];
    byKey.set(r.key, {
      key: r.key,
      name: r.name,
      isSystem: !!builtin,
      permissions: perms,
    });
  }
  return [...byKey.values()];
}

/* ------------------------------- guards ------------------------------- */

export function canView(ctx: ActiveContext, page: PageKey): boolean {
  return hasView(ctx.user.perms, page);
}
export function canEdit(ctx: ActiveContext, page: PageKey): boolean {
  return hasEdit(ctx.user.perms, page);
}

/** Server-side page guard — call at the top of every page's server component. */
export function requirePage(ctx: ActiveContext, page: PageKey): void {
  if (!canView(ctx, page)) redirect(roleHome(ctx.user.role));
}

/** Edit-level page guard for mutations (Phase B). Throws (does not redirect). */
export function requireEdit(ctx: ActiveContext, page: PageKey): void {
  if (!canEdit(ctx, page)) {
    throw new Error("Forbidden: your role has view-only access to this section.");
  }
}

/** Server-action guard by explicit role list. Throws (does not redirect). */
export function assertRole(ctx: ActiveContext, roles: string[]): void {
  if (!roles.includes(ctx.user.role)) {
    throw new Error("Forbidden: your role does not allow this action.");
  }
}

/**
 * Mutation guard that adds custom-role edit-gating WITHOUT changing built-in
 * behavior. Built-in roles keep their exact legacy allow-list (no escalation
 * or lockout); a CUSTOM role is allowed only if it has "edit" on `page`. Use
 * this in place of assertRole() for page-scoped mutations.
 */
export function assertCanMutate(ctx: ActiveContext, page: PageKey, builtinAllowed: string[]): void {
  if (BUILTIN_ROLES[ctx.user.role]) {
    if (!builtinAllowed.includes(ctx.user.role)) {
      throw new Error("Forbidden: your role does not allow this action.");
    }
    return;
  }
  if (!hasEdit(ctx.user.perms, page)) {
    throw new Error("Forbidden: your role has view-only access to this section.");
  }
}

/** Office roles that review/approve delivery drafts + manage money. */
export const OFFICE_ROLES = ["platform_admin", "admin", "accountant"];
/** Roles allowed to manage users / core settings. */
export const ADMIN_ROLES = ["platform_admin", "admin"];
