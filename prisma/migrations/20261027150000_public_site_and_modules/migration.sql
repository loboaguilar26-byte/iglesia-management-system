-- Contenido público y horarios (aporte de main). Estas columnas y la tabla ya las crean las
-- migraciones 20261023153450_settings_public_content y 20261025120000_portal_and_public_content
-- de la rama de módulos; por eso todo es idempotente: en una base que ya las tiene no hace nada.

ALTER TABLE "ministry" ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "church_settings"
  ADD COLUMN IF NOT EXISTS "tagline" TEXT,
  ADD COLUMN IF NOT EXISTS "welcomeText" TEXT,
  ADD COLUMN IF NOT EXISTS "firstVisitText" TEXT,
  ADD COLUMN IF NOT EXISTS "whatsapp" TEXT,
  ADD COLUMN IF NOT EXISTS "mapUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "facebookUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "youtubeUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "mission" TEXT,
  ADD COLUMN IF NOT EXISTS "vision" TEXT,
  ADD COLUMN IF NOT EXISTS "valuesText" TEXT,
  ADD COLUMN IF NOT EXISTS "privacyNotice" TEXT;

CREATE TABLE IF NOT EXISTS "service_schedule" (
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

CREATE INDEX IF NOT EXISTS "service_schedule_dayOfWeek_startTime_idx" ON "service_schedule"("dayOfWeek", "startTime");

-- Validaciones de día y hora: solo si la tabla aún no tiene las equivalentes (schedule_day_valid /
-- schedule_time_format en la rama de módulos).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'service_schedule'::regclass AND conname IN ('schedule_day_valid', 'service_schedule_day_valid')) THEN
    ALTER TABLE "service_schedule" ADD CONSTRAINT "service_schedule_day_valid" CHECK ("dayOfWeek" BETWEEN 0 AND 6);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'service_schedule'::regclass AND conname IN ('schedule_time_format', 'service_schedule_time_format')) THEN
    ALTER TABLE "service_schedule" ADD CONSTRAINT "service_schedule_time_format" CHECK ("startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND ("endTime" IS NULL OR "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'));
  END IF;
END $$;
