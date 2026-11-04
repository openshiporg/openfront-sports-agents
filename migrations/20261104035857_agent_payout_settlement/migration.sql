-- CreateTable
CREATE TABLE "AgentPayout" (
    "id" TEXT NOT NULL,
    "payee" TEXT,
    "reference" TEXT NOT NULL DEFAULT '',
    "method" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "paidOn" DATE NOT NULL,
    "totalCents" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPayoutEntry" (
    "id" TEXT NOT NULL,
    "payout" TEXT,
    "ledgerEntry" TEXT,
    "amountCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentPayoutEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentPayout_payee_idx" ON "AgentPayout"("payee");

-- CreateIndex
CREATE INDEX "AgentPayout_recordedBy_idx" ON "AgentPayout"("recordedBy");

-- CreateIndex
CREATE UNIQUE INDEX "AgentPayoutEntry_ledgerEntry_key" ON "AgentPayoutEntry"("ledgerEntry");

-- CreateIndex
CREATE INDEX "AgentPayoutEntry_payout_idx" ON "AgentPayoutEntry"("payout");

-- AddForeignKey
ALTER TABLE "AgentPayout" ADD CONSTRAINT "AgentPayout_payee_fkey" FOREIGN KEY ("payee") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPayout" ADD CONSTRAINT "AgentPayout_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPayoutEntry" ADD CONSTRAINT "AgentPayoutEntry_payout_fkey" FOREIGN KEY ("payout") REFERENCES "AgentPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPayoutEntry" ADD CONSTRAINT "AgentPayoutEntry_ledgerEntry_fkey" FOREIGN KEY ("ledgerEntry") REFERENCES "CommissionLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
