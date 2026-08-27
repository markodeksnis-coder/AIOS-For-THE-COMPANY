-- Records every hit to /api/cron/daily, regardless of outcome, so a
-- misconfigured cron (missing CRON_SECRET, bad auth header) is visible
-- without Vercel function logs. One row per UTC calendar day.

CREATE TABLE "CronRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "lastAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL
);

CREATE UNIQUE INDEX "CronRun_date_key" ON "CronRun"("date");
