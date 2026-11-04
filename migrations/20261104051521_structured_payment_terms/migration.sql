-- AlterEnum
ALTER TYPE "AmendmentKindType" ADD VALUE 'change_payment_terms';

-- AlterTable
ALTER TABLE "EndorsementDeal" ADD COLUMN     "paymentTermsDays" INTEGER;

-- AlterTable
ALTER TABLE "PlayingContract" ADD COLUMN     "paymentTermsDays" INTEGER;

-- Backfill deals from the retired free text, same rules as legacyTermsDays in features/keystone/lib/paymentTerms.ts:
-- "Net N" (N 0 to 120) gives N, "due on/upon receipt" or "immediate(ly)" gives 0, anything else stays NULL (never guessed).
-- The free-text column is kept so every backfilled value can be audited against its source.
UPDATE "EndorsementDeal" SET "paymentTermsDays" = CASE
  WHEN "paymentTerms" ~* '\mnet\s*-?\s*\d{1,3}\M' THEN
    CASE WHEN substring("paymentTerms" from '(?i)\mnet\s*-?\s*(\d{1,3})\M')::int <= 120
         THEN substring("paymentTerms" from '(?i)\mnet\s*-?\s*(\d{1,3})\M')::int END
  WHEN "paymentTerms" ~* '\mdue\s+(on|upon)\s+receipt\M|\mimmediate(ly)?\M' THEN 0
  ELSE NULL END
WHERE "paymentTermsDays" IS NULL AND "paymentTerms" <> '';
