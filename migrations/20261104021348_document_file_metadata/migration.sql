-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "byteSize" INTEGER,
ADD COLUMN     "fileName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mimeType" TEXT NOT NULL DEFAULT '';
