-- CreateEnum
CREATE TYPE "SummaryStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "MaterialInstrucional" ADD COLUMN     "summary" TEXT,
ADD COLUMN     "summaryGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "summaryStatus" "SummaryStatus" NOT NULL DEFAULT 'PENDING';
