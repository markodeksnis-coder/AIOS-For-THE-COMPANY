-- CreateTable
CREATE TABLE "AgentActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentSlug" TEXT NOT NULL,
    "agentTitle" TEXT NOT NULL,
    "department" TEXT,
    "kind" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actions" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AgentActivity_agentSlug_idx" ON "AgentActivity"("agentSlug");

-- CreateIndex
CREATE INDEX "AgentActivity_createdAt_idx" ON "AgentActivity"("createdAt");
