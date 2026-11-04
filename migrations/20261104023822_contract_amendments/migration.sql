-- CreateEnum
CREATE TYPE "AmendmentKindType" AS ENUM ('reschedule_payment', 'extend_deal_term', 'move_deliverable', 'add_deliverable');

-- AlterTable
ALTER TABLE "ContractYear" ADD COLUMN     "firstPaymentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Amendment" (
    "id" TEXT NOT NULL,
    "athlete" TEXT,
    "contract" TEXT,
    "deal" TEXT,
    "kind" "AmendmentKindType" DEFAULT 'reschedule_payment',
    "reason" TEXT NOT NULL DEFAULT '',
    "before" JSONB,
    "after" JSONB,
    "appliedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Amendment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Amendment_athlete_idx" ON "Amendment"("athlete");

-- CreateIndex
CREATE INDEX "Amendment_contract_idx" ON "Amendment"("contract");

-- CreateIndex
CREATE INDEX "Amendment_deal_idx" ON "Amendment"("deal");

-- CreateIndex
CREATE INDEX "Amendment_appliedBy_idx" ON "Amendment"("appliedBy");

-- AddForeignKey
ALTER TABLE "Amendment" ADD CONSTRAINT "Amendment_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amendment" ADD CONSTRAINT "Amendment_contract_fkey" FOREIGN KEY ("contract") REFERENCES "PlayingContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amendment" ADD CONSTRAINT "Amendment_deal_fkey" FOREIGN KEY ("deal") REFERENCES "EndorsementDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amendment" ADD CONSTRAINT "Amendment_appliedBy_fkey" FOREIGN KEY ("appliedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
