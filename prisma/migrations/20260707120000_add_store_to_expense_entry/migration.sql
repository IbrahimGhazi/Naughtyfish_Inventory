-- AlterTable: attribute an expense entry to a store (store-management costs).
ALTER TABLE "ExpenseEntry" ADD COLUMN "storeId" TEXT;

-- CreateIndex
CREATE INDEX "ExpenseEntry_storeId_idx" ON "ExpenseEntry"("storeId");

-- AddForeignKey (SET NULL keeps the money record if a store is deleted)
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
