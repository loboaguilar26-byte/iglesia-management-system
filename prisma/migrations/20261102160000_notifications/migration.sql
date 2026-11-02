CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE "NotificationType" AS ENUM ('EVENT_REMINDER', 'ATTENDANCE_CONFIRMATION', 'SCHEDULE_CHANGE', 'PASTORAL_REQUEST', 'VISITOR_FOLLOWUP');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "notification" (
  "id" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "type" "NotificationType" NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "error" TEXT,
  "memberId" TEXT,
  "eventId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMPTZ(3),
  CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_status_createdAt_idx" ON "notification"("status", "createdAt");
CREATE INDEX "notification_memberId_createdAt_idx" ON "notification"("memberId", "createdAt");
ALTER TABLE "notification" ADD CONSTRAINT "notification_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notification" ADD CONSTRAINT "notification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
