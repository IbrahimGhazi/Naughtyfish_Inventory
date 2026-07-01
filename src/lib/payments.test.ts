import { describe, it, expect } from "vitest";
import {
  priorPaidAgainstInvoice,
  invoiceOutstanding,
  isPartialPayment,
} from "./payments";

describe("priorPaidAgainstInvoice", () => {
  it("sums prior payment amounts", () => {
    expect(priorPaidAgainstInvoice([{ amount: 100 }, { amount: 250.5 }])).toBe(350.5);
  });
  it("is 0 with no prior payments", () => {
    expect(priorPaidAgainstInvoice([])).toBe(0);
  });
});

describe("invoiceOutstanding", () => {
  it("is total minus prior paid", () => {
    expect(invoiceOutstanding(1000, 300)).toBe(700);
  });
  it("floors at 0 when overpaid", () => {
    expect(invoiceOutstanding(1000, 1200)).toBe(0);
  });
});

describe("isPartialPayment", () => {
  it("is partial when amount is less than the still-outstanding amount", () => {
    // outstanding = 1000 − 0 = 1000; paying 400 is partial.
    expect(isPartialPayment(400, 1000, 0)).toBe(true);
  });

  it("is NOT partial when the amount clears the full outstanding", () => {
    expect(isPartialPayment(1000, 1000, 0)).toBe(false);
  });

  it("is NOT partial when the amount exceeds the outstanding", () => {
    expect(isPartialPayment(1500, 1000, 0)).toBe(false);
  });

  it("accounts for prior payments when deciding partiality", () => {
    // total 1000, already paid 700 → outstanding 300.
    expect(isPartialPayment(200, 1000, 700)).toBe(true); // 200 < 300 → partial
    expect(isPartialPayment(300, 1000, 700)).toBe(false); // clears remainder
  });

  it("is not partial once the invoice is already fully paid", () => {
    // outstanding floored at 0, so any positive payment is >= 0 → not partial.
    expect(isPartialPayment(50, 1000, 1000)).toBe(false);
  });
});
