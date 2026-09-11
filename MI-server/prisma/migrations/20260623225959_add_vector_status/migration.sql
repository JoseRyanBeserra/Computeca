-- CreateEnum
CREATE TYPE "VectorStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "MaterialInstrucional" ADD COLUMN     "vectorStatus" "VectorStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "MaterialInstrucional_vectorStatus_idx" ON "MaterialInstrucional"("vectorStatus");
