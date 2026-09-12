-- CreateTable
CREATE TABLE "DeliveryClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "business" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "system" TEXT,
    "platform" TEXT,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "done" TEXT NOT NULL DEFAULT '{}',
    "homeworkDone" TEXT NOT NULL DEFAULT '{}',
    "ticks" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "DeliveryClient_system_idx" ON "DeliveryClient"("system");
