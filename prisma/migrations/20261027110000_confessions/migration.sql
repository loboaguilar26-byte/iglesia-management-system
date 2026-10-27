CREATE TYPE "ConfessionAppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "ConfessionMessageStatus" AS ENUM ('NEW', 'READ', 'RESPONDED', 'CLOSED');

CREATE TABLE "confession_appointment" (
    "id" TEXT NOT NULL,
    "locationKey" VARCHAR(160) NOT NULL,
    "locationName" VARCHAR(160) NOT NULL,
    "chapelId" TEXT,
    "scheduledAt" TIMESTAMPTZ(3) NOT NULL,
    "contactCiphertext" TEXT,
    "contactIv" VARCHAR(24),
    "contactAuthTag" VARCHAR(24),
    "status" "ConfessionAppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "handledById" TEXT,

    CONSTRAINT "confession_appointment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "confession_appointment_contact_encryption" CHECK (
      ("contactCiphertext" IS NULL AND "contactIv" IS NULL AND "contactAuthTag" IS NULL)
      OR ("contactCiphertext" IS NOT NULL AND "contactIv" IS NOT NULL AND "contactAuthTag" IS NOT NULL)
    ),
    CONSTRAINT "confession_appointment_location_valid" CHECK (
      ("chapelId" IS NULL AND "locationKey" = 'main')
      OR ("chapelId" IS NOT NULL AND "locationKey" = 'chapel:' || "chapelId")
    )
);

CREATE TABLE "confession_message" (
    "id" TEXT NOT NULL,
    "bodyCiphertext" TEXT NOT NULL,
    "bodyIv" VARCHAR(24) NOT NULL,
    "bodyAuthTag" VARCHAR(24) NOT NULL,
    "priestResponseCiphertext" TEXT,
    "responseIv" VARCHAR(24),
    "responseAuthTag" VARCHAR(24),
    "status" "ConfessionMessageStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "handledById" TEXT,

    CONSTRAINT "confession_message_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "confession_message_response_encryption" CHECK (
      ("priestResponseCiphertext" IS NULL AND "responseIv" IS NULL AND "responseAuthTag" IS NULL)
      OR ("priestResponseCiphertext" IS NOT NULL AND "responseIv" IS NOT NULL AND "responseAuthTag" IS NOT NULL)
    )
);

CREATE INDEX "confession_appointment_status_scheduledAt_idx" ON "confession_appointment"("status", "scheduledAt");
CREATE INDEX "confession_appointment_createdAt_idx" ON "confession_appointment"("createdAt");
CREATE INDEX "confession_message_status_createdAt_idx" ON "confession_message"("status", "createdAt");

-- A cancelled booking releases its slot; requested and confirmed slots cannot collide.
CREATE UNIQUE INDEX "confession_appointment_active_slot_key"
  ON "confession_appointment"("locationKey", "scheduledAt")
  WHERE "status" <> 'CANCELLED';

ALTER TABLE "confession_appointment"
  ADD CONSTRAINT "confession_appointment_chapelId_fkey"
  FOREIGN KEY ("chapelId") REFERENCES "chapel"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "confession_appointment"
  ADD CONSTRAINT "confession_appointment_handledById_fkey"
  FOREIGN KEY ("handledById") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "confession_message"
  ADD CONSTRAINT "confession_message_handledById_fkey"
  FOREIGN KEY ("handledById") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permission" ("id", "key", "description")
VALUES
  ('permission-confessions-read', 'confessions:read', 'Leer solicitudes y mensajes confidenciales de confesión'),
  ('permission-confessions-manage', 'confessions:manage', 'Confirmar citas y responder mensajes de confesión')
ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";

INSERT INTO "role" ("id", "key", "name", "description", "isSystem", "hierarchyLevel", "createdAt")
VALUES ('role-priest', 'PRIEST', 'Sacerdote', 'Acceso exclusivo a las citas y mensajes confidenciales de confesión.', true, 55, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isSystem" = true,
  "hierarchyLevel" = EXCLUDED."hierarchyLevel";

INSERT INTO "role_permission" ("roleId", "permissionId")
SELECT role."id", permission."id"
FROM "role"
CROSS JOIN "permission"
WHERE role."key" = 'PRIEST'
  AND permission."key" IN ('confessions:read', 'confessions:manage')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
