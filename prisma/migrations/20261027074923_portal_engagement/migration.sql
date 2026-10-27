-- CreateEnum
CREATE TYPE "RsvpResponse" AS ENUM ('GOING', 'MAYBE', 'NOT_GOING');

-- CreateEnum
CREATE TYPE "PrayerStatus" AS ENUM ('OPEN', 'PRAYING', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- DropIndex
DROP INDEX "donation_chapelId_idx";

-- DropIndex
DROP INDEX "event_chapelId_idx";

-- DropIndex
DROP INDEX "member_chapelId_idx";

-- CreateTable
CREATE TABLE "event_rsvp" (
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "response" "RsvpResponse" NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "event_rsvp_pkey" PRIMARY KEY ("eventId","memberId")
);

-- CreateTable
CREATE TABLE "prayer_request" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "subject" VARCHAR(120) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "isConfidential" BOOLEAN NOT NULL DEFAULT true,
    "status" "PrayerStatus" NOT NULL DEFAULT 'OPEN',
    "pastoralNote" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "closedAt" TIMESTAMPTZ(3),
    "handledById" TEXT,

    CONSTRAINT "prayer_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ministry_join_request" (
    "id" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "message" VARCHAR(500),
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "responseNote" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(3),
    "reviewedById" TEXT,

    CONSTRAINT "ministry_join_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_rsvp_memberId_idx" ON "event_rsvp"("memberId");

-- CreateIndex
CREATE INDEX "prayer_request_memberId_createdAt_idx" ON "prayer_request"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "prayer_request_status_createdAt_idx" ON "prayer_request"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ministry_join_request_ministryId_status_idx" ON "ministry_join_request"("ministryId", "status");

-- CreateIndex
CREATE INDEX "ministry_join_request_memberId_idx" ON "ministry_join_request"("memberId");

-- AddForeignKey
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_request" ADD CONSTRAINT "prayer_request_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prayer_request" ADD CONSTRAINT "prayer_request_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ministry_join_request" ADD CONSTRAINT "ministry_join_request_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ministry_join_request" ADD CONSTRAINT "ministry_join_request_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ministry_join_request" ADD CONSTRAINT "ministry_join_request_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Una sola solicitud pendiente por persona y ministerio.
CREATE UNIQUE INDEX "ministry_join_request_one_pending" ON "ministry_join_request" ("ministryId", "memberId") WHERE status = 'PENDING';

-- Una petición cerrada o respondida registra cuándo.
ALTER TABLE "prayer_request" ADD CONSTRAINT "prayer_closed_at" CHECK ((status IN ('ANSWERED','CLOSED')) = ("closedAt" IS NOT NULL));
