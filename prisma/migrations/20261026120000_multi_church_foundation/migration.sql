-- Base multiiglesia: agrega franquicias, sedes y configuración por iglesia
-- sin mover ni borrar los módulos existentes.

ALTER TABLE "role" ADD COLUMN "hierarchyLevel" INTEGER NOT NULL DEFAULT 50;

CREATE TABLE "franchise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "franchise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "church" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "church_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "church_profile" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "logoPath" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1e3a5f',
    "accentColor" TEXT NOT NULL DEFAULT '#d97706',
    "fontFamily" TEXT NOT NULL DEFAULT 'Geist',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "currency" CHAR(3) NOT NULL DEFAULT 'MXN',
    "aboutText" TEXT,
    "scheduleText" TEXT,
    "terminology" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "church_profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "church_membership" (
    "userId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "church_membership_pkey" PRIMARY KEY ("userId","churchId")
);

CREATE TABLE "church_role_assignment" (
    "userId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "church_role_assignment_pkey" PRIMARY KEY ("userId","churchId","roleId")
);

CREATE UNIQUE INDEX "franchise_slug_key" ON "franchise"("slug");
CREATE INDEX "franchise_isActive_idx" ON "franchise"("isActive");
CREATE UNIQUE INDEX "church_slug_key" ON "church"("slug");
CREATE INDEX "church_franchiseId_isActive_idx" ON "church"("franchiseId", "isActive");
CREATE UNIQUE INDEX "church_profile_churchId_key" ON "church_profile"("churchId");
CREATE INDEX "church_membership_churchId_idx" ON "church_membership"("churchId");
CREATE INDEX "church_role_assignment_churchId_roleId_idx" ON "church_role_assignment"("churchId", "roleId");

ALTER TABLE "church" ADD CONSTRAINT "church_franchiseId_fkey"
  FOREIGN KEY ("franchiseId") REFERENCES "franchise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "church_profile" ADD CONSTRAINT "church_profile_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "church_profile" ADD CONSTRAINT "church_profile_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "church_membership" ADD CONSTRAINT "church_membership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "church_membership" ADD CONSTRAINT "church_membership_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "church_role_assignment" ADD CONSTRAINT "church_role_assignment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "church_role_assignment" ADD CONSTRAINT "church_role_assignment_churchId_fkey"
  FOREIGN KEY ("churchId") REFERENCES "church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "church_role_assignment" ADD CONSTRAINT "church_role_assignment_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "church_role_assignment" ADD CONSTRAINT "church_role_assignment_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
