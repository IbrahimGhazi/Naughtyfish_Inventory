import { describe, it, expect } from "vitest";
import { deleteEntityBusinessData, resetTotal } from "./reset";

/**
 * The reset walks children → parents. We can't hit a real DB here, so a fake
 * transaction client records the order + arguments of every deleteMany and we
 * assert the foreign-key-safe sequence holds. If someone reorders the deletes
 * and breaks an FK dependency, this test catches it before prod does.
 */
function fakeTx() {
  const order: string[] = [];
  const model = (name: string) => ({
    deleteMany: (args: unknown) => {
      order.push(name);
      (order as unknown as { args: Record<string, unknown> }).args ??= {};
      (order as unknown as { args: Record<string, unknown> }).args[name] = args;
      return Promise.resolve({ count: 1 });
    },
  });
  const tx = {
    payment: model("payment"),
    stockMovement: model("stockMovement"),
    deliveryRecord: model("deliveryRecord"),
    badDebtEntry: model("badDebtEntry"),
    shipment: model("shipment"),
    glazingSetting: model("glazingSetting"),
    storeInventoryLine: model("storeInventoryLine"),
    process: model("process"),
    expenseEntry: model("expenseEntry"),
    invoice: model("invoice"),
    purchaseLineItem: model("purchaseLineItem"),
    purchase: model("purchase"),
    cheque: model("cheque"),
    storeScope: model("storeScope"),
    item: model("item"),
    store: model("store"),
    party: model("party"),
  };
  return { tx, order };
}

describe("deleteEntityBusinessData", () => {
  it("deletes children before the parents they reference", async () => {
    const { tx, order } = fakeTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deleteEntityBusinessData(tx as any, "e1");

    const before = (a: string, b: string) =>
      expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));

    // Payments & stock reference invoices/purchases → go first.
    before("payment", "invoice");
    before("payment", "purchase");
    before("stockMovement", "invoice");
    before("stockMovement", "item");
    // Purchase line items have no cascade → before purchases.
    before("purchaseLineItem", "purchase");
    // Processes reference expense entries.
    before("process", "expenseEntry");
    // Master data last: everything referencing item/store/party is gone first.
    before("invoice", "item");
    before("glazingSetting", "item");
    before("storeInventoryLine", "store");
    before("storeScope", "store");
    before("purchase", "store");
    before("purchase", "party");
    before("item", "store");
    before("store", "party");
  });

  it("scopes tables without an entityId through their parent relation", async () => {
    const { tx, order } = fakeTx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deleteEntityBusinessData(tx as any, "e1");
    const args = (order as unknown as { args: Record<string, { where: unknown }> }).args;
    expect(args.storeInventoryLine.where).toEqual({ store: { entityId: "e1" } });
    expect(args.purchaseLineItem.where).toEqual({ purchase: { entityId: "e1" } });
    expect(args.storeScope.where).toEqual({ store: { entityId: "e1" } });
    expect(args.invoice.where).toEqual({ entityId: "e1" });
  });

  it("resetTotal sums the per-table counts", () => {
    expect(resetTotal({ a: 2, b: 3, c: 0 })).toBe(5);
    expect(resetTotal({})).toBe(0);
  });
});
