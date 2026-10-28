-- AlterTable
ALTER TABLE "chapel" ADD COLUMN     "aboutText" VARCHAR(4000),
ADD COLUMN     "accentColor" VARCHAR(7) NOT NULL DEFAULT '#c8832a',
ADD COLUMN     "coverPath" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mapUrl" VARCHAR(500),
ADD COLUMN     "primaryColor" VARCHAR(7) NOT NULL DEFAULT '#10253d',
ADD COLUMN     "scheduleText" VARCHAR(2000),
ADD COLUMN     "tagline" VARCHAR(160),
ADD COLUMN     "whatsapp" VARCHAR(30);

-- Colores en formato hexadecimal (#RRGGBB) y enlaces de mapa solo http(s).
ALTER TABLE "chapel" ADD CONSTRAINT "chapel_colors_hex" CHECK ("primaryColor" ~ '^#[0-9a-fA-F]{6}$' AND "accentColor" ~ '^#[0-9a-fA-F]{6}$');
ALTER TABLE "chapel" ADD CONSTRAINT "chapel_map_url_http" CHECK ("mapUrl" IS NULL OR "mapUrl" ~ '^https?://');
