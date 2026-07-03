/**
 * Role → page/action access matrix (plan §5, roadmap M3.1).
 *
 * UI hiding is NOT enforcement: every page calls requirePage() server-side and
 * every sensitive server action calls assertRole(). The delivery role gets its
 * own restricted portal (/delivery) and is redirected there from everything else.
 *
 * platform_admin is the PRODUCT OWNER's hidden role (white-label operator). It
 * can see everything including /platform, and never appears in client-facing
 * role pickers (see ASSIGNABLE_ROLES in enums.ts).
 */
import { redirect } from "next/navigation";
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

const ALL_CLIENT_PAGES: PageKey[] = [
  "dashboard", "invoices", "purchases", "parties", "shipments", "inventory", "processes",
  "cheques", "banks", "expenses", "reports", "settings",
];

/** Which pages each role may open. (Delivery may ALSO open its own invoices —
 *  that per-record exception is handled in the invoice pages themselves.) */
const ROLE_PAGES: Record<string, PageKey[]> = {
  platform_admin: [...ALL_CLIENT_PAGES, "platform", "delivery"],
  admin: ALL_CLIENT_PAGES,
  accountant: ALL_CLIENT_PAGES.filter((p) => p !== "settings"),
  north_employee: ["dashboard", "invoices", "parties", "shipments", "inventory"],
  store_keeper: ["dashboard", "inventory", "shipments", "processes"],
  delivery: ["delivery"],
};

export function canAccessPage(role: string, page: PageKey): boolean {
  return (ROLE_PAGES[role] ?? []).includes(page);
}

/** Where a role lands after login / after a blocked navigation. */
export function roleHome(role: string): string {
  return role === "delivery" ? "/delivery" : "/";
}

/** Server-side page guard — call at the top of every page's server component. */
export function requirePage(ctx: ActiveContext, page: PageKey): void {
  if (!canAccessPage(ctx.user.role, page)) redirect(roleHome(ctx.user.role));
}

/** Server-action guard. Throws (does not redirect) so callers get an error. */
export function assertRole(ctx: ActiveContext, roles: string[]): void {
  if (!roles.includes(ctx.user.role)) {
    throw new Error("Forbidden: your role does not allow this action.");
  }
}

/** Office roles that review/approve delivery drafts + manage money. */
export const OFFICE_ROLES = ["platform_admin", "admin", "accountant"];
/** Roles allowed to manage users / core settings. */
export const ADMIN_ROLES = ["platform_admin", "admin"];
