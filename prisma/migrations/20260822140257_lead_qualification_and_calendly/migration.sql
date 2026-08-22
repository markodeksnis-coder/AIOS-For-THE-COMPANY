-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "calendlyEventUri" TEXT;
ALTER TABLE "Lead" ADD COLUMN "instagramOrLinkedin" TEXT;
ALTER TABLE "Lead" ADD COLUMN "location" TEXT;
ALTER TABLE "Lead" ADD COLUMN "monthlyRevenue" REAL;
ALTER TABLE "Lead" ADD COLUMN "nextCallAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "sellsService" TEXT;
ALTER TABLE "Lead" ADD COLUMN "yearsRunningAgency" REAL;

-- CreateIndex
CREATE INDEX "Lead_calendlyEventUri_idx" ON "Lead"("calendlyEventUri");
