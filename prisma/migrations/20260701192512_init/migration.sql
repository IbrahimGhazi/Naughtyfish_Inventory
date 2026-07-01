-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bookType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "entityAccess" TEXT NOT NULL DEFAULT 'cstar',
    "regionScope" TEXT NOT NULL DEFAULT 'all',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "User_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoreScope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    CONSTRAINT "StoreScope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StoreScope_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "partyType" TEXT NOT NULL DEFAULT 'customer',
    "subType" TEXT,
    "channel" TEXT,
    "address" TEXT,
    "ntn" TEXT,
    "openingBalance" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "Party_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'fish_fillet',
    "cartonWeightKg" DECIMAL NOT NULL DEFAULT 20,
    "packetsPerCarton" INTEGER NOT NULL DEFAULT 10,
    "isPrawn" BOOLEAN NOT NULL DEFAULT false,
    "fixedRate" DECIMAL,
    "defaultGlazingPct" DECIMAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "Item_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GlazingSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expectedGlazingPct" DECIMAL NOT NULL,
    "varianceTolerancePct" DECIMAL NOT NULL DEFAULT 0,
    "itemId" TEXT NOT NULL,
    "partyId" TEXT,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "GlazingSetting_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GlazingSetting_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GlazingSetting_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "ownershipType" TEXT NOT NULL DEFAULT 'own',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "Store_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoreInventoryLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartonCount" INTEGER NOT NULL DEFAULT 0,
    "packetCount" INTEGER NOT NULL DEFAULT 0,
    "kgPerCarton" DECIMAL NOT NULL DEFAULT 0,
    "totalKg" DECIMAL NOT NULL DEFAULT 0,
    "storeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "StoreInventoryLine_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StoreInventoryLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReferenceSeries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prefix" TEXT NOT NULL DEFAULT 'SSI-',
    "bookRegion" TEXT NOT NULL,
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "digitWidth" INTEGER NOT NULL DEFAULT 6,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "ReferenceSeries_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "estimatedBalance" DECIMAL NOT NULL DEFAULT 0,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "BankAccount_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cheque" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chequeNumber" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "issueDate" DATETIME,
    "clearingDue" DATETIME,
    "reminderDate" DATETIME,
    "direction" TEXT NOT NULL DEFAULT 'incoming',
    "status" TEXT NOT NULL DEFAULT 'issued',
    "recipientName" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bankAccountId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "Cheque_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Cheque_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" INTEGER NOT NULL,
    "referenceNumber" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "partyId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sourceStoreId" TEXT,
    "createdById" TEXT,
    CONSTRAINT "Invoice_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_sourceStoreId_fkey" FOREIGN KEY ("sourceStoreId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grossWeightKg" DECIMAL NOT NULL,
    "finalWeightKg" DECIMAL,
    "glazingPct" DECIMAL NOT NULL DEFAULT 0,
    "netWeightKg" DECIMAL NOT NULL,
    "ratePerKg" DECIMAL NOT NULL,
    "amount" DECIMAL NOT NULL,
    "cartonCount" INTEGER,
    "packetCount" INTEGER,
    "cartonWeightKg" DECIMAL,
    "invoiceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceLineItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,
    "totalAmount" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "optionalPhoto" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,
    "partyId" TEXT NOT NULL,
    "storeFromId" TEXT,
    "deliveredById" TEXT,
    "entityId" TEXT NOT NULL,
    "invoiceId" TEXT,
    CONSTRAINT "DeliveryRecord_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryRecord_storeFromId_fkey" FOREIGN KEY ("storeFromId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryRecord_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryRecord_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemName" TEXT NOT NULL,
    "grossWeightKg" DECIMAL NOT NULL,
    "finalWeightKg" DECIMAL,
    "glazingPct" DECIMAL NOT NULL DEFAULT 0,
    "netWeightKg" DECIMAL NOT NULL,
    "ratePerKg" DECIMAL NOT NULL,
    "amount" DECIMAL NOT NULL,
    "cartonCount" INTEGER,
    "packetCount" INTEGER,
    "recordId" TEXT NOT NULL,
    CONSTRAINT "DeliveryLineItem_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "DeliveryRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
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
    "chequeId" TEXT,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "Payment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "Cheque" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BadDebtEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personName" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "subCategory" TEXT NOT NULL DEFAULT 'bad_debt',
    "note" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "BadDebtEntry_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isOwnerAdded" BOOLEAN NOT NULL DEFAULT false,
    "entityId" TEXT NOT NULL,
    CONSTRAINT "ExpenseCategory_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" DECIMAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "categoryId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "enteredById" TEXT,
    CONSTRAINT "ExpenseEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseEntry_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseEntry_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Entity_name_key" ON "Entity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreScope_userId_storeId_key" ON "StoreScope"("userId", "storeId");

-- CreateIndex
CREATE INDEX "Party_entityId_partyType_idx" ON "Party"("entityId", "partyType");

-- CreateIndex
CREATE INDEX "Item_entityId_idx" ON "Item"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "GlazingSetting_itemId_partyId_key" ON "GlazingSetting"("itemId", "partyId");

-- CreateIndex
CREATE INDEX "Store_entityId_idx" ON "Store"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreInventoryLine_storeId_itemId_key" ON "StoreInventoryLine"("storeId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceSeries_entityId_bookRegion_key" ON "ReferenceSeries"("entityId", "bookRegion");

-- CreateIndex
CREATE INDEX "BankAccount_entityId_idx" ON "BankAccount"("entityId");

-- CreateIndex
CREATE INDEX "Cheque_entityId_status_idx" ON "Cheque"("entityId", "status");

-- CreateIndex
CREATE INDEX "Cheque_reminderDate_idx" ON "Cheque"("reminderDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_entityId_partyId_idx" ON "Invoice"("entityId", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRecord_invoiceId_key" ON "DeliveryRecord"("invoiceId");

-- CreateIndex
CREATE INDEX "DeliveryRecord_entityId_partyId_deliveredAt_idx" ON "DeliveryRecord"("entityId", "partyId", "deliveredAt");

-- CreateIndex
CREATE INDEX "Payment_entityId_partyId_idx" ON "Payment"("entityId", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_entityId_name_key" ON "ExpenseCategory"("entityId", "name");

-- CreateIndex
CREATE INDEX "ExpenseEntry_entityId_categoryId_idx" ON "ExpenseEntry"("entityId", "categoryId");
