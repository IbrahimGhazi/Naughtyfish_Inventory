import type { Prisma } from "@prisma/client";

/**
 * Danger-zone data reset. Deletes ALL business + master data for ONE book
 * (entity) — parties, items, stores, invoices, invoice-expenses, purchases,
 * deliveries, payments, shipments, stock, processes, cheques and expense
 * entries — while KEEPING the
 * things that would otherwise lock the owner out or break the app: the login
 * accounts (User), the books themselves (Entity), roles, deployment config
 * (AppConfig), the expense-category taxonomy, bank accounts and reference series.
 *
 * The delete order below walks children → parents so every foreign key is
 * already clear by the time its parent row is removed. Two tables carry no
 * `entityId` of their own (StoreInventoryLine, StoreScope, PurchaseLineItem) and
 * are scoped through their parent's relation. InvoiceLineItem / DeliveryLineItem
 * are removed by the `onDelete: Cascade` on their parent.
 *
 * MUST be called inside a `$transaction` so a mid-way failure rolls everything
 * back — a half-wiped book is worse than none. Returns per-table delete counts.
 */
export type ResetSummary = Record<string, number>;

export async function deleteEntityBusinessData(
  tx: Prisma.TransactionClient,
  entityId: string,
): Promise<ResetSummary> {
  const s: ResetSummary = {};
  const many = async (label: string, p: Promise<{ count: number }>) => {
    s[label] = (await p).count;
  };

  // 1. Ledger rows that point at almost everything else — clear first.
  await many("payments", tx.payment.deleteMany({ where: { entityId } }));
  await many("stockMovements", tx.stockMovement.deleteMany({ where: { entityId } }));

  // 2. Party/invoice-linked records (delivery line items cascade with the record).
  await many("deliveryRecords", tx.deliveryRecord.deleteMany({ where: { entityId } }));
  await many("badDebts", tx.badDebtEntry.deleteMany({ where: { entityId } }));
  await many("shipments", tx.shipment.deleteMany({ where: { entityId } }));
  await many("glazingSettings", tx.glazingSetting.deleteMany({ where: { entityId } }));

  // 3. Stock on-hand (no entityId — scope through the store relation).
  await many(
    "storeInventoryLines",
    tx.storeInventoryLine.deleteMany({ where: { store: { entityId } } }),
  );

  // 4. Processes and invoice-expenses reference expense entries — remove them
  // before the entries (and before the invoices invoice-expenses point at).
  await many("processes", tx.process.deleteMany({ where: { entityId } }));
  await many("invoiceExpenses", tx.invoiceExpense.deleteMany({ where: { entityId } }));
  await many("expenseEntries", tx.expenseEntry.deleteMany({ where: { entityId } }));

  // 5. Invoices (line items cascade). Everything that referenced them is gone.
  await many("invoices", tx.invoice.deleteMany({ where: { entityId } }));

  // 6. Purchases — line items have no cascade, so delete them first.
  await many(
    "purchaseLineItems",
    tx.purchaseLineItem.deleteMany({ where: { purchase: { entityId } } }),
  );
  await many("purchases", tx.purchase.deleteMany({ where: { entityId } }));

  // 7. Cheques (payments already gone; bank accounts are kept).
  await many("cheques", tx.cheque.deleteMany({ where: { entityId } }));

  // 8. Master data. StoreScope has no entityId — scope through the store.
  await many("storeScopes", tx.storeScope.deleteMany({ where: { store: { entityId } } }));
  await many("items", tx.item.deleteMany({ where: { entityId } }));
  await many("stores", tx.store.deleteMany({ where: { entityId } }));
  await many("parties", tx.party.deleteMany({ where: { entityId } }));

  return s;
}

/** Total rows removed across all tables — for the confirmation message. */
export function resetTotal(summary: ResetSummary): number {
  return Object.values(summary).reduce((a, b) => a + b, 0);
}
