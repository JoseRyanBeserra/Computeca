-- AlterTable
ALTER TABLE "InspectionLog" ADD COLUMN     "tag" TEXT;

-- CreateIndex
CREATE INDEX "InspectionLog_tag_idx" ON "InspectionLog"("tag");
