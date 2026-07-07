-- Processes: raw/processed items, in-house transformations, store capabilities,
-- and store-to-store transfers with a process option. All additive.

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "defaultProcessedItemId" TEXT,
ADD COLUMN     "nature" TEXT NOT NULL DEFAULT 'processed';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "processCapabilities" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "processId" TEXT,
ADD COLUMN     "shipmentId" TEXT;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "applyProcess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "destinationStoreId" TEXT,
ADD COLUMN     "outputItemId" TEXT,
ADD COLUMN     "outputKg" DECIMAL(65,30),
ADD COLUMN     "processTypes" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "stockMovedAt" TIMESTAMP(3),
ADD COLUMN     "transferItemId" TEXT,
ADD COLUMN     "transferKg" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Process" ADD COLUMN     "inputItemId" TEXT,
ADD COLUMN     "inputKg" DECIMAL(65,30),
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'transformation',
ADD COLUMN     "lossKg" DECIMAL(65,30),
ADD COLUMN     "outputItemId" TEXT,
ADD COLUMN     "outputKg" DECIMAL(65,30),
ADD COLUMN     "processTypes" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "stockMovedAt" TIMESTAMP(3),
ADD COLUMN     "storeId" TEXT,
ALTER COLUMN "destination" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseLineItem" ADD COLUMN     "processTypes" TEXT NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "Item_entityId_nature_idx" ON "Item"("entityId", "nature");

-- CreateIndex
CREATE INDEX "Process_storeId_idx" ON "Process"("storeId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_defaultProcessedItemId_fkey" FOREIGN KEY ("defaultProcessedItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_destinationStoreId_fkey" FOREIGN KEY ("destinationStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_transferItemId_fkey" FOREIGN KEY ("transferItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_inputItemId_fkey" FOREIGN KEY ("inputItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Tag the single legacy vendor-dispatch Process row so the redesigned UI
-- renders it as a legacy record rather than a broken transformation.
UPDATE "Process" SET "kind" = 'dispatch' WHERE "inputItemId" IS NULL AND "destination" IS NOT NULL;
