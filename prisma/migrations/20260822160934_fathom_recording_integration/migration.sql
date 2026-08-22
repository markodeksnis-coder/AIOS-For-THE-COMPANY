-- AlterTable
ALTER TABLE "SalesCall" ADD COLUMN "fathomRecordingId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SalesCall_fathomRecordingId_key" ON "SalesCall"("fathomRecordingId");

