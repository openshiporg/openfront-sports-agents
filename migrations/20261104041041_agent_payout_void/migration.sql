-- CreateEnum
CREATE TYPE "AgentPayoutStatusType" AS ENUM ('paid', 'voided');

-- AlterTable
ALTER TABLE "AgentPayout" ADD COLUMN     "releasedEntries" JSONB,
ADD COLUMN     "status" "AgentPayoutStatusType" DEFAULT 'paid',
ADD COLUMN     "voidReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedBy" TEXT;

-- CreateIndex
CREATE INDEX "AgentPayout_voidedBy_idx" ON "AgentPayout"("voidedBy");

-- AddForeignKey
ALTER TABLE "AgentPayout" ADD CONSTRAINT "AgentPayout_voidedBy_fkey" FOREIGN KEY ("voidedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
