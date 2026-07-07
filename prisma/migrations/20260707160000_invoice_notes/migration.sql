-- CreateTable
CREATE TABLE "InvoiceNote" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "InvoiceNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceNote_entityId_idx" ON "InvoiceNote"("entityId");

-- AddForeignKey
ALTER TABLE "InvoiceNote" ADD CONSTRAINT "InvoiceNote_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

