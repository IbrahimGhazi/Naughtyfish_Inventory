import { describe, it, expect } from "vitest";
import { totalBadDebts, groupForPrint, type BadDebtRow } from "./summary";

function row(partial: Partial<BadDebtRow> & { id: string }): BadDebtRow {
  return {
    id: partial.id,
    personName: partial.personName ?? "Someone",
    amount: partial.amount ?? 0,
    subCategory: partial.subCategory ?? "bad_debt",
    note: partial.note ?? null,
    date: partial.date ?? "2026-07-01T00:00:00.000Z",
    partyId: partial.partyId ?? null,
    partyName: partial.partyName ?? null,
    invoiceId: partial.invoiceId ?? null,
    invoiceNumber: partial.invoiceNumber ?? null,
  };
}

describe("totalBadDebts", () => {
  it("splits totals by sub-category and reconciles the grand total", () => {
    const rows = [
      row({ id: "a", subCategory: "bad_debt", amount: 1000 }),
      row({ id: "b", subCategory: "dispute", amount: 250.5 }),
      row({ id: "c", subCategory: "bad_debt", amount: 99.5 }),
      row({ id: "d", subCategory: "dispute", amount: 0.25 }),
    ];
    const t = totalBadDebts(rows);
    expect(t.badDebt).toBe(1099.5);
    expect(t.dispute).toBe(250.75);
    expect(t.grand).toBe(1350.25);
    expect(t.grand).toBe(t.badDebt + t.dispute);
  });

  it("returns zeros for an empty ledger", () => {
    expect(totalBadDebts([])).toEqual({ badDebt: 0, dispute: 0, grand: 0 });
  });

  it("kills binary-float dust via 2dp rounding", () => {
    const rows = [
      row({ id: "a", subCategory: "bad_debt", amount: 0.1 }),
      row({ id: "b", subCategory: "bad_debt", amount: 0.2 }),
    ];
    expect(totalBadDebts(rows).badDebt).toBe(0.3);
  });
});

describe("groupForPrint", () => {
  it("orders Disputes before Bad debts, each with its own subtotal", () => {
    const rows = [
      row({ id: "a", subCategory: "bad_debt", amount: 100 }),
      row({ id: "b", subCategory: "dispute", amount: 40 }),
      row({ id: "c", subCategory: "bad_debt", amount: 60 }),
      row({ id: "d", subCategory: "dispute", amount: 10 }),
    ];
    const { groups, grandTotal } = groupForPrint(rows);
    expect(groups.map((g) => g.subCategory)).toEqual(["dispute", "bad_debt"]);
    expect(groups[0].title).toBe("Disputes");
    expect(groups[0].subtotal).toBe(50);
    expect(groups[1].title).toBe("Bad debts");
    expect(groups[1].subtotal).toBe(160);
    expect(grandTotal).toBe(210);
  });

  it("drops empty groups (only disputes present)", () => {
    const rows = [row({ id: "b", subCategory: "dispute", amount: 40 })];
    const { groups, grandTotal } = groupForPrint(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].subCategory).toBe("dispute");
    expect(grandTotal).toBe(40);
  });

  it("preserves input row order within a group", () => {
    const rows = [
      row({ id: "x", subCategory: "bad_debt", amount: 1 }),
      row({ id: "y", subCategory: "bad_debt", amount: 2 }),
      row({ id: "z", subCategory: "bad_debt", amount: 3 }),
    ];
    const { groups } = groupForPrint(rows);
    expect(groups[0].rows.map((r) => r.id)).toEqual(["x", "y", "z"]);
  });

  it("returns no groups for an empty ledger", () => {
    const { groups, grandTotal } = groupForPrint([]);
    expect(groups).toEqual([]);
    expect(grandTotal).toBe(0);
  });
});
