-- Add coverImage to Module
ALTER TABLE "Module" ADD COLUMN "coverImage" TEXT;

-- Create Task table
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- Create index on Task
CREATE INDEX "Task_roomId_order_idx" ON "Task"("roomId", "order");

-- Add foreign key for Task -> Room
ALTER TABLE "Task" ADD CONSTRAINT "Task_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing content/questions into a default task per room
INSERT INTO "Task" ("id", "roomId", "title", "contentHtml", "order", "createdAt", "updatedAt")
SELECT
    'task_' || "Room"."id",
    "Room"."id",
    'Task 1',
    COALESCE("Room"."contentHtml", ''),
    0,
    NOW(),
    NOW()
FROM "Room"
WHERE COALESCE("Room"."contentHtml", '') <> ''
   OR EXISTS (SELECT 1 FROM "Question" WHERE "Question"."roomId" = "Room"."id");

-- Add taskId column to Question (nullable first)
ALTER TABLE "Question" ADD COLUMN "taskId" TEXT;

-- Populate taskId from the migrated tasks
UPDATE "Question" SET "taskId" = 'task_' || "roomId";

-- Keep task counts aligned after migration
UPDATE "Room"
SET "tasksCount" = (
    SELECT COUNT(*) FROM "Task" WHERE "Task"."roomId" = "Room"."id"
);

-- Drop old unique constraint and index on Question
DROP INDEX IF EXISTS "Question_roomId_blockId_key";
DROP INDEX IF EXISTS "Question_roomId_order_idx";

-- Remove roomId from Question
ALTER TABLE "Question" DROP COLUMN "roomId";

-- Make taskId NOT NULL
ALTER TABLE "Question" ALTER COLUMN "taskId" SET NOT NULL;

-- Create new constraints on Question
CREATE UNIQUE INDEX "Question_taskId_blockId_key" ON "Question"("taskId", "blockId");
CREATE INDEX "Question_taskId_order_idx" ON "Question"("taskId", "order");

-- Add foreign key for Question -> Task
ALTER TABLE "Question" ADD CONSTRAINT "Question_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove old content fields from Room
ALTER TABLE "Room" DROP COLUMN IF EXISTS "contentHtml";
ALTER TABLE "Room" DROP COLUMN IF EXISTS "contentCss";
ALTER TABLE "Room" DROP COLUMN IF EXISTS "layoutJson";
