-- CreateTable
CREATE TABLE "BrainFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "department" TEXT,
    "owner" TEXT,
    "status" TEXT NOT NULL,
    "updated" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "links" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "BrainFile_path_key" ON "BrainFile"("path");

-- CreateIndex
CREATE UNIQUE INDEX "BrainFile_slug_key" ON "BrainFile"("slug");

-- CreateIndex
CREATE INDEX "BrainFile_type_idx" ON "BrainFile"("type");

-- CreateIndex
CREATE INDEX "BrainFile_department_idx" ON "BrainFile"("department");
