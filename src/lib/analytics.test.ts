import { describe, it, expect } from "vitest";
import { lastNMonths, monthlyPnL, tally } from "./analytics";

// A fixed reference so tests never touch the system clock.
const REF = new Date(2026, 6, 15); // 2026-07-15 (July)

describe("lastNMonths", () => {
  it("returns `count` months ending at the reference month, oldest → newest", () => {
    const months = lastNMonths(REF, 6);
    expect(months.map((m) => m.key)).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
    expect(months.map((m) => m.label)).toEqual([
      "Feb", "Mar", "Apr", "May", "Jun", "Jul",
    ]);
  });

  it("crosses the year boundary correctly", () => {
    const months = lastNMonths(new Date(2026, 1, 10), 4); // Feb 2026
    expect(months.map((m) => m.key)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("starts every bucket at zero", () => {
    for (const m of lastNMonths(REF, 3)) {
      expect(m).toMatchObject({ revenue: 0, expenses: 0, profit: 0 });
    }
  });
});

describe("monthlyPnL", () => {
  it("buckets revenue and expenses by calendar month and computes profit", () => {
    const result = monthlyPnL(
      [
        { date: new Date(2026, 6, 1), amount: 850500 }, // Jul
        { date: new Date(2026, 6, 20), amount: 90600 }, // Jul
        { date: new Date(2026, 5, 3), amount: 200000 }, // Jun
      ],
      [
        { date: new Date(2026, 6, 5), amount: 40000 }, // Jul
        { date: new Date(2026, 5, 9), amount: 250000 }, // Jun (loss month)
      ],
      REF,
      6,
    );
    const jul = result.find((m) => m.key === "2026-07")!;
    const jun = result.find((m) => m.key === "2026-06")!;
    expect(jul).toMatchObject({ revenue: 941100, expenses: 40000, profit: 901100 });
    expect(jun).toMatchObject({ revenue: 200000, expenses: 250000, profit: -50000 });
  });

  it("ignores rows outside the month window", () => {
    const result = monthlyPnL(
      [{ date: new Date(2020, 0, 1), amount: 999999 }], // way before window
      [],
      REF,
      6,
    );
    expect(result.reduce((s, m) => s + m.revenue, 0)).toBe(0);
  });

  it("handles all-zero months gracefully", () => {
    const result = monthlyPnL([], [], REF, 6);
    expect(result).toHaveLength(6);
    expect(result.every((m) => m.revenue === 0 && m.expenses === 0 && m.profit === 0)).toBe(true);
  });

  it("accepts ISO string dates", () => {
    const result = monthlyPnL(
      [{ date: "2026-07-10T12:00:00.000Z", amount: 100 }],
      [],
      REF,
      6,
    );
    expect(result.find((m) => m.key === "2026-07")!.revenue).toBe(100);
  });
});

describe("tally", () => {
  const ORDER = [
    { key: "preparing", label: "Preparing" },
    { key: "in_transit", label: "In transit" },
    { key: "delayed", label: "Delayed" },
    { key: "delivered", label: "Delivered" },
  ];

  it("counts rows into the fixed bucket order, keeping empty buckets", () => {
    const slices = tally(
      [
        { key: "in_transit" },
        { key: "in_transit" },
        { key: "delayed" },
      ],
      ORDER,
    );
    expect(slices).toEqual([
      { label: "Preparing", value: 0 },
      { label: "In transit", value: 2 },
      { label: "Delayed", value: 1 },
      { label: "Delivered", value: 0 },
    ]);
  });

  it("drops unknown keys", () => {
    const slices = tally([{ key: "cancelled" }, { key: "nonsense" }], ORDER);
    expect(slices.every((s) => s.value === 0)).toBe(true);
  });
});
