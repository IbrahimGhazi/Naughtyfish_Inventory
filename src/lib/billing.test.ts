import { describe, it, expect } from "vitest";
import {
  computeLine,
  computeInvoiceTotal,
  netFromGlazing,
  glazingFromWeights,
  roundMoney,
  roundKg,
  BillingError,
  PRAWN_DEFAULT_WATER_PERCENT,
} from "./billing";

describe("primitive conversions", () => {
  it("net = gross × (1 − glazing%/100), proportional", () => {
    expect(netFromGlazing(1000, 5)).toBe(950);
    expect(netFromGlazing(1261.2, 5.8)).toBe(roundKg(1261.2 * 0.942)); // ≈ 1187.85
  });

  it("glazing% derived from the two weighings", () => {
    expect(glazingFromWeights(1000, 950)).toBe(5);
    expect(glazingFromWeights(200, 200)).toBe(0); // no deduction
  });

  it("rejects final weight exceeding gross (data-entry error)", () => {
    expect(() => glazingFromWeights(100, 120)).toThrow(BillingError);
    try {
      glazingFromWeights(100, 120);
    } catch (e) {
      expect((e as BillingError).code).toBe("FINAL_EXCEEDS_GROSS");
    }
  });

  it("rejects out-of-range glazing%", () => {
    expect(() => netFromGlazing(100, 100)).toThrow(/GLAZING|range/i);
    expect(() => netFromGlazing(100, -1)).toThrow(BillingError);
  });

  it("rejects non-positive gross", () => {
    expect(() => netFromGlazing(0, 5)).toThrow(BillingError);
    expect(() => netFromGlazing(-10, 5)).toThrow(BillingError);
  });
});

describe("computeLine — PRIMARY path (North: gross + final → derive %)", () => {
  it("derives glazing% and nets on the buyer's final weight", () => {
    // Plan §6 worked-example structure (rate is a placeholder, NOT from transcript).
    const RATE = 900; // placeholder only
    const line = computeLine({
      grossWeightKg: 1261.2,
      finalWeightKg: 1187.85,
      ratePerKg: RATE,
      channel: "north",
    });
    expect(line.glazingPercent).toBeCloseTo(5.82, 1);
    expect(line.netWeightKg).toBe(1187.85);
    expect(line.amount).toBe(roundMoney(RATE * 1187.85));
  });

  it("handles the 5kg-short edit case (recompute on smaller gross)", () => {
    const before = computeLine({ grossWeightKg: 1000, finalWeightKg: 950, ratePerKg: 100, channel: "north" });
    const after = computeLine({ grossWeightKg: 995, finalWeightKg: 945, ratePerKg: 100, channel: "north" });
    expect(after.netWeightKg).toBeLessThan(before.netWeightKg);
    expect(after.amount).toBeLessThan(before.amount);
  });
});

describe("computeLine — SECONDARY path (gross + glazing% → derive net)", () => {
  it("derives net from a supplied %", () => {
    const line = computeLine({ grossWeightKg: 1000, glazingPercent: 3, ratePerKg: 500, channel: "north" });
    expect(line.netWeightKg).toBe(970);
    expect(line.amount).toBe(roundMoney(500 * 970));
  });

  it("prefers the primary path when both final weight and % are given", () => {
    const line = computeLine({
      grossWeightKg: 1000,
      finalWeightKg: 900, // → 10%
      glazingPercent: 3, // should be ignored
      ratePerKg: 100,
      channel: "north",
    });
    expect(line.glazingPercent).toBe(10);
    expect(line.netWeightKg).toBe(900);
  });
});

describe("computeLine — LOCAL (Karachi, fresh)", () => {
  it("defaults to zero glazing (net = gross) when no glazing is entered", () => {
    const line = computeLine({ grossWeightKg: 300, ratePerKg: 200, channel: "local" });
    expect(line.glazingPercent).toBe(0);
    expect(line.netWeightKg).toBe(300);
    expect(line.amount).toBe(roundMoney(200 * 300));
  });

  it("HONORS an entered glazing % on local (glazing is no longer forced to 0)", () => {
    const line = computeLine({ grossWeightKg: 300, glazingPercent: 9, ratePerKg: 200, channel: "local" });
    expect(line.glazingPercent).toBe(9);
    expect(line.netWeightKg).toBe(273); // 300 × (1 − 0.09)
    expect(line.amount).toBe(roundMoney(200 * 273));
  });
});

describe("computeLine — prawn override", () => {
  it("applies ~50% water when nothing measured is supplied", () => {
    const line = computeLine({ grossWeightKg: 2, isPrawn: true, ratePerKg: 1000, channel: "north" });
    expect(line.glazingPercent).toBe(PRAWN_DEFAULT_WATER_PERCENT);
    expect(line.netWeightKg).toBe(1); // 2kg box ≈ 1kg product
  });

  it("still respects a measured final weight over the prawn default", () => {
    const line = computeLine({ grossWeightKg: 2, finalWeightKg: 1.2, isPrawn: true, ratePerKg: 1000, channel: "north" });
    expect(line.netWeightKg).toBe(1.2);
  });
});

describe("computeLine — glazing variance alert (money recovery)", () => {
  it("raises an alert when the buyer deducts more than the agreed baseline", () => {
    // PC Lahore cuts 5% while baseline is 3% (plan §4.3).
    const line = computeLine({
      grossWeightKg: 1000,
      finalWeightKg: 950, // 5%
      ratePerKg: 100,
      channel: "north",
      expectedGlazingPercent: 3,
    });
    expect(line.varianceAlert).toBeDefined();
    expect(line.varianceAlert!.exceededByPercent).toBe(2);
  });

  it("no alert when within the agreed baseline", () => {
    const line = computeLine({
      grossWeightKg: 1000,
      finalWeightKg: 970, // 3%
      ratePerKg: 100,
      channel: "north",
      expectedGlazingPercent: 3,
    });
    expect(line.varianceAlert).toBeUndefined();
  });

  it("does not alert on local channel (no glazing)", () => {
    const line = computeLine({
      grossWeightKg: 1000,
      ratePerKg: 100,
      channel: "local",
      expectedGlazingPercent: 3,
    });
    expect(line.varianceAlert).toBeUndefined();
  });
});

describe("computeLine — packet short-count alert (dispute defense)", () => {
  it("flags 44 packets where 45 were expected", () => {
    const line = computeLine({
      grossWeightKg: 100,
      glazingPercent: 5,
      ratePerKg: 100,
      channel: "north",
      packetCount: 44,
      expectedPacketCount: 45,
    });
    expect(line.packetShortAlert).toEqual({ expected: 45, actual: 44, shortBy: 1 });
  });

  it("no alert when counts match", () => {
    const line = computeLine({
      grossWeightKg: 100,
      glazingPercent: 5,
      ratePerKg: 100,
      channel: "north",
      packetCount: 45,
      expectedPacketCount: 45,
    });
    expect(line.packetShortAlert).toBeUndefined();
  });
});

describe("computeLine — validation", () => {
  it("throws when a north line has neither final weight nor %", () => {
    expect(() =>
      computeLine({ grossWeightKg: 100, ratePerKg: 100, channel: "north" }),
    ).toThrow(/MISSING_GLAZING_INPUT|either/i);
  });
});

describe("computeInvoiceTotal", () => {
  it("sums line amounts to money precision", () => {
    const l1 = computeLine({ grossWeightKg: 1000, finalWeightKg: 942, ratePerKg: 100, channel: "north" });
    const l2 = computeLine({ grossWeightKg: 300, ratePerKg: 200, channel: "local" });
    const total = computeInvoiceTotal([l1, l2]);
    expect(total).toBe(roundMoney(l1.amount + l2.amount));
  });

  it("empty invoice totals to 0", () => {
    expect(computeInvoiceTotal([])).toBe(0);
  });
});
