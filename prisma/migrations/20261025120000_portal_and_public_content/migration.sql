-- Ministerios visibles en el sitio público (solo nombre y descripción).
ALTER TABLE "ministry" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- Texto configurable de la sección "Tu primera visita".
ALTER TABLE "church_settings" ADD COLUMN "firstVisitText" TEXT;
