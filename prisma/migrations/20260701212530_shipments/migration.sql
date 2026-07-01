-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'preparing',
    "originName" TEXT NOT NULL,
    "originCity" TEXT,
    "destinationName" TEXT,
    "destinationCity" TEXT NOT NULL,
    "departureAt" DATETIME,
    "estimatedArrivalAt" DATETIME,
    "deliveredAt" DATETIME,
    "carrier" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "entityId" TEXT NOT NULL,
    "partyId" TEXT,
    "invoiceId" TEXT,
    "originStoreId" TEXT,
    CONSTRAINT "Shipment_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shipment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shipment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shipment_originStoreId_fkey" FOREIGN KEY ("originStoreId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Shipment_entityId_status_idx" ON "Shipment"("entityId", "status");
