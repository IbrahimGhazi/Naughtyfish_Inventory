-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseNumber" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "supplierBillNo" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "totalAmount" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "entityId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "enteredById" TEXT,
    CONSTRAINT "Purchase_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weightKg" DECIMAL NOT NULL,
    "ratePerKg" DECIMAL NOT NULL,
    "cartons" INTEGER,
    "amount" DECIMAL NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "PurchaseLineItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseLineItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "isPrecautionaryCash" BOOLEAN NOT NULL DEFAULT false,
    "promiseOfCheque" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "partyId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "purchaseId" TEXT,
    "chequeId" TEXT,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "Payment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "Cheque" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "chequeId", "date", "entityId", "id", "invoiceId", "isPartial", "isPrecautionaryCash", "note", "partyId", "promiseOfCheque", "type") SELECT "amount", "chequeId", "date", "entityId", "id", "invoiceId", "isPartial", "isPrecautionaryCash", "note", "partyId", "promiseOfCheque", "type" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE INDEX "Payment_entityId_partyId_idx" ON "Payment"("entityId", "partyId");
CREATE INDEX "Payment_purchaseId_idx" ON "Payment"("purchaseId");
CREATE TABLE "new_StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "cartons" INTEGER NOT NULL DEFAULT 0,
    "packets" INTEGER NOT NULL DEFAULT 0,
    "kg" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'posted',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromStoreId" TEXT,
    "toStoreId" TEXT,
    "itemId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "purchaseId" TEXT,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "StockMovement_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StockMovement" ("cartons", "createdAt", "entityId", "fromStoreId", "id", "invoiceId", "itemId", "kg", "note", "packets", "status", "toStoreId", "type") SELECT "cartons", "createdAt", "entityId", "fromStoreId", "id", "invoiceId", "itemId", "kg", "note", "packets", "status", "toStoreId", "type" FROM "StockMovement";
DROP TABLE "StockMovement";
ALTER TABLE "new_StockMovement" RENAME TO "StockMovement";
CREATE INDEX "StockMovement_entityId_itemId_idx" ON "StockMovement"("entityId", "itemId");
CREATE INDEX "StockMovement_invoiceId_idx" ON "StockMovement"("invoiceId");
CREATE INDEX "StockMovement_purchaseId_idx" ON "StockMovement"("purchaseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Purchase_entityId_partyId_idx" ON "Purchase"("entityId", "partyId");

-- CreateIndex
CREATE INDEX "Purchase_entityId_date_idx" ON "Purchase"("entityId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_entityId_purchaseNumber_key" ON "Purchase"("entityId", "purchaseNumber");

-- CreateIndex
CREATE INDEX "PurchaseLineItem_purchaseId_idx" ON "PurchaseLineItem"("purchaseId");
