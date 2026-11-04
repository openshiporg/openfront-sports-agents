-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "forecastProbabilities" JSONB DEFAULT '{"prospect":10,"negotiating":40,"signed":90,"active":100}';
