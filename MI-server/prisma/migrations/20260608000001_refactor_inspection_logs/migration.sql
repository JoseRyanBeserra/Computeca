-- Refactor InspectionLog: remove requestId/level, update direction enum, add correlationId

-- 1. Clear existing observability data (safe to discard during schema refactor)
TRUNCATE "InspectionLog";

-- 2. Drop index and columns that depend on old enums
DROP INDEX "InspectionLog_requestId_idx";
ALTER TABLE "InspectionLog" DROP COLUMN "requestId";
ALTER TABLE "InspectionLog" DROP COLUMN "level";
ALTER TABLE "InspectionLog" DROP COLUMN "direction";

-- 3. Drop old enums
DROP TYPE "InspectionLogLevel";
DROP TYPE "InspectionLogDirection";

-- 4. Create updated direction enum
CREATE TYPE "InspectionLogDirection" AS ENUM ('CLIENT_TO_SERVER', 'SERVER_TO_CLIENT');

-- 5. Re-add direction column with new enum and add correlationId
ALTER TABLE "InspectionLog" ADD COLUMN "direction" "InspectionLogDirection" NOT NULL DEFAULT 'CLIENT_TO_SERVER';
ALTER TABLE "InspectionLog" ALTER COLUMN "direction" DROP DEFAULT;
ALTER TABLE "InspectionLog" ADD COLUMN "correlationId" TEXT;

-- 6. Create new index
CREATE INDEX "InspectionLog_correlationId_idx" ON "InspectionLog"("correlationId");
