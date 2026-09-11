-- AlterTable
ALTER TABLE "MaterialInstrucional" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;

-- CreateIndex
CREATE INDEX "MaterialInstrucional_deletedAt_idx" ON "MaterialInstrucional"("deletedAt");
