import { describe, it, expect } from "vitest";
import { nextReferencePreview } from "./preview";

describe("nextReferencePreview", () => {
  it("previews currentNumber + 1, zero-padded to digitWidth", () => {
    expect(nextReferencePreview("SSI-", 122, 6)).toBe("SSI-000123");
  });

  it("from a fresh series (0) previews the first number", () => {
    expect(nextReferencePreview("KHI-", 0, 4)).toBe("KHI-0001");
  });

  it("does not truncate when the number is wider than digitWidth", () => {
    expect(nextReferencePreview("LHR-", 9999, 3)).toBe("LHR-10000");
  });

  it("guards against a non-positive digitWidth (falls back to 1)", () => {
    expect(nextReferencePreview("X", 4, 0)).toBe("X5");
  });

  it("guards against a non-finite currentNumber (treats as 0)", () => {
    expect(nextReferencePreview("SSI-", Number.NaN, 6)).toBe("SSI-000001");
  });
});
