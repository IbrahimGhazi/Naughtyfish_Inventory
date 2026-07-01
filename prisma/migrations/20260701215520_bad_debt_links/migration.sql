-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BadDebtEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personName" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "subCategory" TEXT NOT NULL DEFAULT 'bad_debt',
    "note" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT NOT NULL,
    "partyId" TEXT,
    "invoiceId" TEXT,
    CONSTRAINT "BadDebtEntry_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BadDebtEntry_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BadDebtEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BadDebtEntry" ("amount", "date", "entityId", "id", "note", "personName", "subCategory") SELECT "amount", "date", "entityId", "id", "note", "personName", "subCategory" FROM "BadDebtEntry";
DROP TABLE "BadDebtEntry";
ALTER TABLE "new_BadDebtEntry" RENAME TO "BadDebtEntry";
CREATE INDEX "BadDebtEntry_entityId_subCategory_idx" ON "BadDebtEntry"("entityId", "subCategory");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
