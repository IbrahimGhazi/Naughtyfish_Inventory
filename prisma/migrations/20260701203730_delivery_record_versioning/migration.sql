-- DropIndex
DROP INDEX "DeliveryRecord_invoiceId_key";

-- CreateIndex
CREATE INDEX "DeliveryRecord_invoiceId_idx" ON "DeliveryRecord"("invoiceId");
