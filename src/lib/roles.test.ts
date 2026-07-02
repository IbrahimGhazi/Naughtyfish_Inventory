import { describe, it, expect } from "vitest";
import { canAccessPage, roleHome, assertRole, OFFICE_ROLES, ADMIN_ROLES } from "./roles";
import type { ActiveContext } from "./session";

const ctxFor = (role: string): ActiveContext => ({
  user: { id: "u1", name: "T", role, entityAccess: "cstar", regionScope: "all", storeIds: [] },
  entityId: "e1",
  entityName: "C-Star",
});

describe("canAccessPage", () => {
  it("delivery is locked to its portal only", () => {
    expect(canAccessPage("delivery", "delivery")).toBe(true);
    for (const page of ["dashboard", "invoices", "parties", "banks", "reports", "settings", "platform"] as const) {
      expect(canAccessPage("delivery", page), page).toBe(false);
    }
  });

  it("platform page is platform_admin-only", () => {
    expect(canAccessPage("platform_admin", "platform")).toBe(true);
    for (const role of ["admin", "accountant", "north_employee", "store_keeper", "delivery"]) {
      expect(canAccessPage(role, "platform"), role).toBe(false);
    }
  });

  it("admin sees every client page but not platform", () => {
    for (const page of ["dashboard", "invoices", "parties", "shipments", "inventory", "processes", "cheques", "banks", "expenses", "reports", "settings"] as const) {
      expect(canAccessPage("admin", page), page).toBe(true);
    }
    expect(canAccessPage("admin", "platform")).toBe(false);
  });

  it("accountant is admin minus settings; store_keeper is stock + processes", () => {
    expect(canAccessPage("accountant", "settings")).toBe(false);
    expect(canAccessPage("accountant", "cheques")).toBe(true);
    expect(canAccessPage("store_keeper", "inventory")).toBe(true);
    expect(canAccessPage("store_keeper", "processes")).toBe(true);
    expect(canAccessPage("store_keeper", "invoices")).toBe(false);
  });

  it("unknown roles can access nothing", () => {
    expect(canAccessPage("bogus", "dashboard")).toBe(false);
  });
});

describe("roleHome", () => {
  it("routes delivery to its portal, everyone else to the dashboard", () => {
    expect(roleHome("delivery")).toBe("/delivery");
    expect(roleHome("admin")).toBe("/");
    expect(roleHome("platform_admin")).toBe("/");
  });
});

describe("assertRole", () => {
  it("throws for a role outside the allow-list and passes inside it", () => {
    expect(() => assertRole(ctxFor("delivery"), OFFICE_ROLES)).toThrow(/Forbidden/);
    expect(() => assertRole(ctxFor("admin"), OFFICE_ROLES)).not.toThrow();
    expect(() => assertRole(ctxFor("accountant"), ADMIN_ROLES)).toThrow(/Forbidden/);
    expect(() => assertRole(ctxFor("platform_admin"), ADMIN_ROLES)).not.toThrow();
  });
});
