-- AlterTable
ALTER TABLE "ScheduledPayment" ADD COLUMN     "baseCommissionCents" BIGINT,
ADD COLUMN     "baseCurrencyCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fxRateMicros" BIGINT;

-- Backfill: payments already received in the agency base currency are stored at rate 1 (no conversion happened).
-- Received payments in any other currency keep NULL: no rate was ever recorded and none is guessed.
UPDATE "ScheduledPayment" sp
SET "fxRateMicros" = 1000000, "baseCurrencyCode" = sp."currencyCode", "baseCommissionCents" = sp."commissionCents"
WHERE sp."status" = 'received'
  AND sp."currencyCode" = (SELECT a."currencyCode" FROM "Agency" a ORDER BY a."createdAt" ASC LIMIT 1);
