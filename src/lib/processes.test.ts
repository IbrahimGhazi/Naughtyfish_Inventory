import { describe, it, expect } from "vitest";
import {
  parseTypes,
  cleanTypes,
  capabilitiesOf,
  assertCapabilities,
  computeLoss,
  yieldPct,
} from "./processes";

describe("parseTypes", () => {
  it("parses a JSON array, keeping only valid types in canonical order", () => {
    expect(parseTypes('["packing","cleaning_cutting","bogus"]')).toEqual([
      "cleaning_cutting",
      "packing",
    ]);
  });
  it("is tolerant of null/empty/garbage", () => {
    expect(parseTypes(null)).toEqual([]);
    expect(parseTypes(undefined)).toEqual([]);
    expect(parseTypes("")).toEqual([]);
    expect(parseTypes("not json")).toEqual([]);
    expect(parseTypes('{"a":1}')).toEqual([]);
  });
});

describe("cleanTypes", () => {
  it("keeps only recognised types in canonical order", () => {
    expect(cleanTypes(["glazing", "nope", "blast_freezing"])).toEqual([
      "blast_freezing",
      "glazing",
    ]);
  });
});

describe("capabilitiesOf / assertCapabilities", () => {
  const store = { name: "Karachi — Own Store", processCapabilities: '["glazing","packing"]' };

  it("reads a store's declared capabilities", () => {
    expect(capabilitiesOf(store)).toEqual(["glazing", "packing"]);
  });
  it("passes when all requested types are supported", () => {
    expect(() => assertCapabilities(store, ["glazing"])).not.toThrow();
    expect(() => assertCapabilities(store, ["glazing", "packing"])).not.toThrow();
  });
  it("throws naming the missing capability", () => {
    expect(() => assertCapabilities(store, ["blast_freezing"])).toThrow(/blast_freezing/);
    expect(() => assertCapabilities(store, ["packing", "cleaning_cutting"])).toThrow(
      /cleaning_cutting/,
    );
  });
});

describe("computeLoss", () => {
  it("returns input − output rounded to grams", () => {
    expect(computeLoss(300, 180)).toBe(120);
    expect(computeLoss(100.5, 100.25)).toBe(0.25);
  });
  it("allows zero loss (lossless step)", () => {
    expect(computeLoss(50, 50)).toBe(0);
  });
  it("throws when output exceeds input", () => {
    expect(() => computeLoss(100, 100.001)).toThrow(/can't be more than/i);
    expect(() => computeLoss(180, 300)).toThrow();
  });
});

describe("yieldPct", () => {
  it("computes output/input percent to one decimal", () => {
    expect(yieldPct(300, 180)).toBe(60);
    expect(yieldPct(200, 150)).toBe(75);
  });
  it("is 0 when input is 0", () => {
    expect(yieldPct(0, 0)).toBe(0);
  });
});
