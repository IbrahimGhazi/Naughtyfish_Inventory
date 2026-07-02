import { describe, it, expect } from "vitest";
import { agingBuckets, topDebtors } from "./analytics";

const NOW = new Date("2026-07-02T12:00:00");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe("agingBuckets", () => {
  it("buckets outstanding balances by invoice age", () => {
    const buckets = agingBuckets(
      [
        { date: daysAgo(5), total: 1000, paid: 0 }, // 0–30
        { date: daysAgo(30), total: 500, paid: 100 }, // 0–30 (boundary)
        { date: daysAgo(45), total: 800, paid: 0 }, // 31–60
        { date: daysAgo(75), total: 300, paid: 0 }, // 61–90
        { date: daysAgo(120), total: 900, paid: 400 }, // 90+
      ],
      NOW,
    );
    expect(buckets.map((b) => b.amount)).toEqual([1400, 800, 300, 500]);
    expect(buckets.map((b) => b.count)).toEqual([2, 1, 1, 1]);
  });

  it("drops fully-paid and overpaid invoices", () => {
    const buckets = agingBuckets(
      [
        { date: daysAgo(10), total: 100, paid: 100 },
        { date: daysAgo(10), total: 100, paid: 150 },
      ],
      NOW,
    );
    expect(buckets.every((b) => b.amount === 0 && b.count === 0)).toBe(true);
  });

  it("treats future-dated invoices as age 0", () => {
    const buckets = agingBuckets([{ date: daysAgo(-3), total: 50, paid: 0 }], NOW);
    expect(buckets[0].amount).toBe(50);
  });

  it("rounds bucket amounts to 2dp", () => {
    const buckets = agingBuckets(
      [
        { date: daysAgo(1), total: 0.105, paid: 0 },
        { date: daysAgo(2), total: 0.105, paid: 0 },
      ],
      NOW,
    );
    expect(buckets[0].amount).toBe(0.21);
  });
});

describe("topDebtors", () => {
  const parties = [
    { id: "a", name: "Alpha", openingBalance: 1000 },
    { id: "b", name: "Beta", openingBalance: 0 },
    { id: "c", name: "Gamma", openingBalance: 0 },
    { id: "d", name: "Delta (settled)", openingBalance: 100 },
  ];
  const invoiced = new Map([
    ["b", 5000],
    ["c", 300],
    ["d", 0],
  ]);
  const paid = new Map([
    ["b", 2000],
    ["d", 100],
  ]);

  it("ranks by opening + invoiced − paid, dropping non-debtors", () => {
    const rows = topDebtors(parties, invoiced, paid);
    expect(rows.map((r) => r.name)).toEqual(["Beta", "Alpha", "Gamma"]);
    expect(rows[0].balance).toBe(3000);
    expect(rows[1].balance).toBe(1000);
  });

  it("respects the limit", () => {
    expect(topDebtors(parties, invoiced, paid, 1)).toHaveLength(1);
  });
});
