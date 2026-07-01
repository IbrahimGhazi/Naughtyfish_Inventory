import { describe, it, expect } from "vitest";
import { aggregateByItem, computeStockDelta } from "./inventory";

describe("aggregateByItem", () => {
  it("sums multiple lines of the same item", () => {
    const agg = aggregateByItem([
      { itemId: "a", kg: 100, cartons: 5, packets: 50 },
      { itemId: "a", kg: 50, cartons: 2, packets: 20 },
      { itemId: "b", kg: 30, cartons: 1, packets: 10 },
    ]);
    expect(agg.get("a")).toEqual({ itemId: "a", kg: 150, cartons: 7, packets: 70 });
    expect(agg.get("b")).toEqual({ itemId: "b", kg: 30, cartons: 1, packets: 10 });
  });
});

describe("computeStockDelta", () => {
  it("returns nothing when lines are unchanged", () => {
    const lines = [{ itemId: "a", kg: 100, cartons: 5, packets: 50 }];
    expect(computeStockDelta(lines, lines)).toEqual([]);
  });

  it("flows stock BACK when the new invoice is short (owner's 5kg-short case)", () => {
    // Dispatched 1261.2 kg; edit corrects to 1256.2 kg → 5 kg returns to store.
    const delta = computeStockDelta(
      [{ itemId: "a", kg: 1261.2, cartons: 5, packets: 0 }],
      [{ itemId: "a", kg: 1256.2, cartons: 5, packets: 0 }],
    );
    expect(delta).toEqual([{ itemId: "a", kg: 5, cartons: 0, packets: 0 }]);
  });

  it("takes MORE out of the store when the new invoice is larger (negative delta)", () => {
    const delta = computeStockDelta(
      [{ itemId: "a", kg: 100, cartons: 5, packets: 50 }],
      [{ itemId: "a", kg: 120, cartons: 6, packets: 60 }],
    );
    expect(delta).toEqual([{ itemId: "a", kg: -20, cartons: -1, packets: -10 }]);
  });

  it("returns the full old quantity for a removed item, and negative full for an added item", () => {
    const delta = computeStockDelta(
      [{ itemId: "a", kg: 100, cartons: 5, packets: 50 }],
      [{ itemId: "b", kg: 40, cartons: 2, packets: 20 }],
    );
    const byId = new Map(delta.map((d) => [d.itemId, d]));
    // Removed item a → its dispatched 100 kg flows back.
    expect(byId.get("a")).toEqual({ itemId: "a", kg: 100, cartons: 5, packets: 50 });
    // Added item b → 40 kg is taken out (negative delta).
    expect(byId.get("b")).toEqual({ itemId: "b", kg: -40, cartons: -2, packets: -20 });
  });

  it("aggregates duplicate item lines before diffing", () => {
    const delta = computeStockDelta(
      [
        { itemId: "a", kg: 60, cartons: 3, packets: 30 },
        { itemId: "a", kg: 40, cartons: 2, packets: 20 },
      ],
      [{ itemId: "a", kg: 90, cartons: 5, packets: 50 }],
    );
    expect(delta).toEqual([{ itemId: "a", kg: 10, cartons: 0, packets: 0 }]);
  });
});
