CREATE TABLE "CtfTeam" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventTitle" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "teamName" TEXT NOT NULL,
  "college" TEXT,
  "inviteCode" TEXT NOT NULL,
  "captainId" TEXT NOT NULL,
  "memberEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "maxMembers" INTEGER NOT NULL DEFAULT 4,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CtfTeam_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CtfTeam_inviteCode_key" ON "CtfTeam"("inviteCode");
CREATE INDEX "CtfTeam_eventId_idx" ON "CtfTeam"("eventId");
CREATE INDEX "CtfTeam_captainId_idx" ON "CtfTeam"("captainId");
CREATE INDEX "CtfTeam_college_idx" ON "CtfTeam"("college");

ALTER TABLE "CtfTeam" ADD CONSTRAINT "CtfTeam_captainId_fkey"
  FOREIGN KEY ("captainId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
