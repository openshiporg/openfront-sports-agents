-- CreateEnum
CREATE TYPE "ForecastSnapshotSourceType" AS ENUM ('manual', 'cron');

-- CreateTable
CREATE TABLE "ForecastSnapshot" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL DEFAULT '',
    "takenAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "takenBy" TEXT,
    "source" "ForecastSnapshotSourceType" DEFAULT 'manual',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "dealCount" INTEGER DEFAULT 0,
    "grossCents" BIGINT NOT NULL,
    "weightedCents" BIGINT NOT NULL,
    "firstMonthGrossCents" BIGINT NOT NULL,
    "firstMonthWeightedCents" BIGINT NOT NULL,
    "probabilities" JSONB,
    "months" JSONB,
    "stages" JSONB,
    "agents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ForecastSnapshot_month_key" ON "ForecastSnapshot"("month");

-- CreateIndex
CREATE INDEX "ForecastSnapshot_takenBy_idx" ON "ForecastSnapshot"("takenBy");

-- AddForeignKey
ALTER TABLE "ForecastSnapshot" ADD CONSTRAINT "ForecastSnapshot_takenBy_fkey" FOREIGN KEY ("takenBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
