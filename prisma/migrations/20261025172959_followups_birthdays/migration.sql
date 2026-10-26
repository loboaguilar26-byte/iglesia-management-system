-- CreateEnum
CREATE TYPE "FollowUpKind" AS ENUM ('CALL', 'VISIT', 'MESSAGE', 'MEETING', 'OTHER');

-- AlterTable
ALTER TABLE "member" ADD COLUMN     "birthDate" DATE;

-- CreateTable
CREATE TABLE "follow_up" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "kind" "FollowUpKind" NOT NULL,
    "contactedOn" DATE NOT NULL,
    "notes" TEXT,
    "nextActionOn" DATE,
    "nextAction" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follow_up_memberId_contactedOn_idx" ON "follow_up"("memberId", "contactedOn");

-- CreateIndex
CREATE INDEX "follow_up_nextActionOn_idx" ON "follow_up"("nextActionOn");

-- AddForeignKey
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "follow_up" ADD CONSTRAINT "follow_up_next_after_contact" CHECK ("nextActionOn" IS NULL OR "nextActionOn" >= "contactedOn");
ALTER TABLE "member" ADD CONSTRAINT "member_birth_not_future" CHECK ("birthDate" IS NULL OR "birthDate" <= CURRENT_DATE);
