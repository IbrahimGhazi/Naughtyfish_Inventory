import { describe, it, expect } from "vitest";
import { computeLiveSales } from "./salesReport";

const names = new Map([
  ["p1", "PC Lahore"],
  ["p2", "Marriott"],
]);

describe("computeLiveSales", () => {
  const now = new Date(2026, 6, 15); // Jul 2026

  it("buckets invoices by month, totals and ranks clients", () => {
    const invoices = [
      { date: new Date(2026, 6, 1), totalAmount: 100, partyId: "p1" }, // Jul
      { date: new Date(2026, 6, 20), totalAmount: 50, partyId: "p2" }, // Jul
      { date: new Date(2026, 5, 10), totalAmount: 30, partyId: "p1" }, // Jun
    ];
    const r = computeLiveSales(invoices, names, now);
    expect(r.total).toBe(180);
    expect(r.count).toBe(3);
    expect(r.monthly).toHaveLength(12);
    // Last bucket is the current month (Jul 2026).
    expect(r.monthly[11]).toMatchObject({ month: "Jul", year: 2026, amount: 150 });
    expect(r.monthly[10]).toMatchObject({ month: "Jun", year: 2026, amount: 30 });
    expect(r.topClients[0]).toEqual({ name: "PC Lahore", amount: 130 });
    expect(r.topClients[1]).toEqual({ name: "Marriott", amount: 50 });
  });

  it("excludes invoices older than the 12-month window", () => {
    const invoices = [
      { date: new Date(2025, 5, 1), totalAmount: 999, partyId: "p1" }, // Jun 2025 — outside
      { date: new Date(2026, 6, 1), totalAmount: 100, partyId: "p1" }, // Jul 2026 — inside
    ];
    const r = computeLiveSales(invoices, names, now);
    expect(r.total).toBe(100);
    expect(r.count).toBe(1);
  });

  it("handles no invoices", () => {
    const r = computeLiveSales([], names, now);
    expect(r.total).toBe(0);
    expect(r.topClients).toHaveLength(0);
    expect(r.monthly).toHaveLength(12);
  });
});
