-- CreateTable
CREATE TABLE "InvoiceExpense" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "expenseEntryId" TEXT,

    CONSTRAINT "InvoiceExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceExpense_expenseEntryId_key" ON "InvoiceExpense"("expenseEntryId");

-- CreateIndex
CREATE INDEX "InvoiceExpense_invoiceId_idx" ON "InvoiceExpense"("invoiceId");

-- AddForeignKey
ALTER TABLE "InvoiceExpense" ADD CONSTRAINT "InvoiceExpense_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceExpense" ADD CONSTRAINT "InvoiceExpense_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceExpense" ADD CONSTRAINT "InvoiceExpense_expenseEntryId_fkey" FOREIGN KEY ("expenseEntryId") REFERENCES "ExpenseEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

