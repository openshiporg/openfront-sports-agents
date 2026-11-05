-- CreateEnum
CREATE TYPE "TrustReconciliationStatusType" AS ENUM ('reconciled', 'exception', 'reopened');

-- AlterTable
ALTER TABLE "ClientTrustEntry" ADD COLUMN     "clearedIn" TEXT;

-- CreateTable
CREATE TABLE "TrustReconciliation" (
    "id" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "statementDate" DATE NOT NULL,
    "statementBalanceCents" BIGINT NOT NULL,
    "bookCents" BIGINT NOT NULL,
    "clearedCents" BIGINT NOT NULL,
    "outstandingCents" BIGINT NOT NULL,
    "differenceCents" BIGINT NOT NULL,
    "status" "TrustReconciliationStatusType" DEFAULT 'reconciled',
    "note" TEXT NOT NULL DEFAULT '',
    "clientBalances" JSONB,
    "preparedBy" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT NOT NULL DEFAULT '',
    "reopenedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrustReconciliation_preparedBy_idx" ON "TrustReconciliation"("preparedBy");

-- CreateIndex
CREATE INDEX "TrustReconciliation_reopenedBy_idx" ON "TrustReconciliation"("reopenedBy");

-- CreateIndex
CREATE INDEX "ClientTrustEntry_clearedIn_idx" ON "ClientTrustEntry"("clearedIn");

-- AddForeignKey
ALTER TABLE "ClientTrustEntry" ADD CONSTRAINT "ClientTrustEntry_clearedIn_fkey" FOREIGN KEY ("clearedIn") REFERENCES "TrustReconciliation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustReconciliation" ADD CONSTRAINT "TrustReconciliation_preparedBy_fkey" FOREIGN KEY ("preparedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustReconciliation" ADD CONSTRAINT "TrustReconciliation_reopenedBy_fkey" FOREIGN KEY ("reopenedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
