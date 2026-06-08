-- AlterTable
ALTER TABLE "Room" ADD COLUMN "contentCss" TEXT;

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'FLAG', 'MCQ');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "answerHash" TEXT,
    "optionsJson" JSONB,
    "hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_roomId_order_idx" ON "Question"("roomId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Question_roomId_blockId_key" ON "Question"("roomId", "blockId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
