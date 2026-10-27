import { recordAudit } from "@/lib/audit";
import { requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizeSearch } from "@/lib/text";
import { parseInput } from "@/lib/validation";
import { Prisma } from "@/generated/prisma/client";
import { createChurchSchema, updateChurchSchema } from "./schema";

const churchSelect = {
  id: true,
  name: true,
  slug: true,
  code: true,
  isActive: true,
  createdAt: true,
  franchise: { select: { id: true, name: true, slug: true } },
  profile: {
    select: {
      primaryColor: true,
      accentColor: true,
      fontFamily: true,
      address: true,
      phone: true,
      email: true,
      timezone: true,
      currency: true,
      aboutText: true,
      scheduleText: true,
    },
  },
} satisfies Prisma.ChurchSelect;

type ChurchRow = Prisma.ChurchGetPayload<{ select: typeof churchSelect }>;

export type ChurchDto = {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  isActive: boolean;
  createdAt: Date;
  franchise: { id: string; name: string; slug: string };
  profile: { primaryColor: string; accentColor: string; timezone: string; currency: string } | null;
};

function toDto(row: ChurchRow): ChurchDto {
  return row;
}

export async function listFranchises(actor: Actor | null) {
  requirePermission(actor, "churches:read");
  return db.franchise.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, _count: { select: { churches: true } } },
    orderBy: { name: "asc" },
  });
}

export async function listChurches(actor: Actor | null): Promise<ChurchDto[]> {
  requirePermission(actor, "churches:read");
  const rows = await db.church.findMany({
    select: churchSelect,
    orderBy: [{ franchise: { name: "asc" } }, { name: "asc" }],
  });
  return rows.map(toDto);
}

function slugify(value: string) {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function createChurch(actor: Actor | null, input: unknown): Promise<ChurchDto> {
  const a = requirePermission(actor, "churches:create");
  const data = parseInput(createChurchSchema, input);

  const id = await db.$transaction(async (tx) => {
    let franchiseId = data.franchiseId;
    if (franchiseId) {
      const franchise = await tx.franchise.findUnique({ where: { id: franchiseId }, select: { id: true } });
      if (!franchise) throw new AppError("NOT_FOUND", "La franquicia seleccionada no existe.");
    } else {
      const franchiseSlug = slugify(data.franchiseName!);
      if (!franchiseSlug) throw new AppError("VALIDATION_ERROR", "El nombre de la franquicia no es válido.");
      const existing = await tx.franchise.findUnique({ where: { slug: franchiseSlug }, select: { id: true } });
      if (existing) throw new AppError("CONFLICT", "Ya existe una franquicia con ese nombre; selecciónala en el formulario.");
      const franchise = await tx.franchise.create({
        data: { name: data.franchiseName!, slug: franchiseSlug },
        select: { id: true },
      });
      franchiseId = franchise.id;
    }

    const existingChurch = await tx.church.findUnique({ where: { slug: data.slug }, select: { id: true } });
    if (existingChurch) throw new AppError("CONFLICT", "Ya existe una iglesia con ese identificador.");

    const church = await tx.church.create({
      data: {
        franchiseId,
        name: data.name,
        slug: data.slug,
        code: data.code || null,
        profile: { create: { primaryColor: data.primaryColor, accentColor: data.accentColor } },
      },
      select: { id: true },
    });
    await recordAudit(tx, a, {
      action: "church.create",
      entityType: "Church",
      entityId: church.id,
      metadata: { name: data.name, slug: data.slug },
    });
    return church.id;
  });

  const result = await db.church.findUnique({ where: { id }, select: churchSelect });
  if (!result) throw new AppError("NOT_FOUND", "No se pudo cargar la iglesia creada.");
  return toDto(result);
}

export async function updateChurch(actor: Actor | null, churchId: string, input: unknown): Promise<ChurchDto> {
  const a = requirePermission(actor, "churches:update");
  const data = parseInput(updateChurchSchema, input);
  const church = await db.church.findUnique({ where: { id: churchId }, select: { id: true } });
  if (!church) throw new AppError("NOT_FOUND", "Iglesia no encontrada.");

  await db.$transaction(async (tx) => {
    await tx.church.update({ where: { id: churchId }, data: { name: data.name, code: data.code || null } });
    await tx.churchProfile.upsert({
      where: { churchId },
      update: {
        primaryColor: data.primaryColor,
        accentColor: data.accentColor,
        fontFamily: data.fontFamily,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        timezone: data.timezone,
        currency: data.currency,
        aboutText: data.aboutText || null,
        scheduleText: data.scheduleText || null,
        updatedById: a.userId,
      },
      create: {
        churchId,
        primaryColor: data.primaryColor,
        accentColor: data.accentColor,
        fontFamily: data.fontFamily,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        timezone: data.timezone,
        currency: data.currency,
        aboutText: data.aboutText || null,
        scheduleText: data.scheduleText || null,
        updatedById: a.userId,
      },
    });
    await recordAudit(tx, a, {
      action: "church.update",
      entityType: "Church",
      entityId: churchId,
      metadata: { name: data.name, currency: data.currency, timezone: data.timezone },
    });
  });

  const result = await db.church.findUnique({ where: { id: churchId }, select: churchSelect });
  if (!result) throw new AppError("NOT_FOUND", "No se pudo cargar la iglesia actualizada.");
  return toDto(result);
}
