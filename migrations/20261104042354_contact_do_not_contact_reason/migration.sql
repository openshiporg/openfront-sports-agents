-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "doNotContactAt" TIMESTAMP(3),
ADD COLUMN     "doNotContactReason" TEXT NOT NULL DEFAULT '';
