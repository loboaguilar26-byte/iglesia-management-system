-- AlterTable
ALTER TABLE "church_settings" ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "mapUrl" TEXT,
ADD COLUMN     "mission" TEXT,
ADD COLUMN     "privacyNotice" TEXT,
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "valuesText" TEXT,
ADD COLUMN     "vision" TEXT,
ADD COLUMN     "welcomeText" TEXT,
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

-- CreateTable
CREATE TABLE "service_schedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dayOfWeek" SMALLINT NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5),
    "location" TEXT,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "service_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_schedule_dayOfWeek_startTime_idx" ON "service_schedule"("dayOfWeek", "startTime");

ALTER TABLE "service_schedule" ADD CONSTRAINT "schedule_day_valid" CHECK ("dayOfWeek" BETWEEN 0 AND 6);
ALTER TABLE "service_schedule" ADD CONSTRAINT "schedule_time_format" CHECK ("startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND ("endTime" IS NULL OR "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'));
