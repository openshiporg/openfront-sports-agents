-- CreateEnum
CREATE TYPE "AthleteLostReasonType" AS ENUM ('signed_elsewhere', 'declined', 'unresponsive', 'ineligible', 'compliance', 'timing', 'other');

-- AlterTable
ALTER TABLE "Athlete" ADD COLUMN     "lostAt" TIMESTAMP(3),
ADD COLUMN     "lostFromStage" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lostNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lostReason" "AthleteLostReasonType" DEFAULT 'other';
