-- CreateEnum
CREATE TYPE "ChapelStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "donation" ADD COLUMN     "chapelId" TEXT;

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "chapelId" TEXT;

-- AlterTable
ALTER TABLE "member" ADD COLUMN     "chapelId" TEXT;

-- AlterTable
ALTER TABLE "ministry" ADD COLUMN     "chapelId" TEXT;

-- CreateTable
CREATE TABLE "chapel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "status" "ChapelStatus" NOT NULL DEFAULT 'ACTIVE',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "openedOn" DATE,
    "managerMemberId" TEXT,
    "managerUserId" TEXT,
    "archivedAt" TIMESTAMPTZ(3),
    "statusReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "chapel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chapel_name_key" ON "chapel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "chapel_code_key" ON "chapel"("code");

-- CreateIndex
CREATE INDEX "chapel_status_idx" ON "chapel"("status");

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_chapelId_fkey" FOREIGN KEY ("chapelId") REFERENCES "chapel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_chapelId_fkey" FOREIGN KEY ("chapelId") REFERENCES "chapel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ministry" ADD CONSTRAINT "ministry_chapelId_fkey" FOREIGN KEY ("chapelId") REFERENCES "chapel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation" ADD CONSTRAINT "donation_chapelId_fkey" FOREIGN KEY ("chapelId") REFERENCES "chapel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapel" ADD CONSTRAINT "chapel_managerMemberId_fkey" FOREIGN KEY ("managerMemberId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapel" ADD CONSTRAINT "chapel_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Reglas de capillas: archivada requiere fecha y motivo; código en mayúsculas sin espacios.
ALTER TABLE "chapel" ADD CONSTRAINT "chapel_archive_complete" CHECK ("status" <> 'ARCHIVED' OR ("archivedAt" IS NOT NULL AND length(trim(coalesce("statusReason", ''))) > 0));
ALTER TABLE "chapel" ADD CONSTRAINT "chapel_code_format" CHECK ("code" ~ '^[A-Z0-9-]{2,12}$');
CREATE INDEX "member_chapelId_idx" ON "member" ("chapelId");
CREATE INDEX "event_chapelId_idx" ON "event" ("chapelId");
CREATE INDEX "donation_chapelId_idx" ON "donation" ("chapelId");
