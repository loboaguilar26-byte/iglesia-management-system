import { recordAudit } from "@/lib/audit";
import { can, requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ROLES } from "@/lib/permissions";
import { normalizeSearch } from "@/lib/text";
import { parseInput } from "@/lib/validation";
import { Prisma } from "@/generated/prisma/client";
import { churchStatusSchema, churchTeamSchema, createChurchSchema, updateChurchSchema } from "./schema";

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

// ───── Panorama estratégico de la red ─────

const DEFAULT_COLORS = ["#1e3a5f", "#d97706"];

type ReadinessProfile = {
  address: string | null;
  phone: string | null;
  email: string | null;
  aboutText: string | null;
  scheduleText: string | null;
  logoPath: string | null;
  primaryColor: string;
  accentColor: string;
} | null;

/** Puntos de configuración que hacen a una sede "lista para operar". */
function churchReadiness(church: { code: string | null; profile: ReadinessProfile; teamCount: number }) {
  const p = church.profile;
  const customColors =
    !!p && !(DEFAULT_COLORS.includes(p.primaryColor.toLowerCase()) && DEFAULT_COLORS.includes(p.accentColor.toLowerCase()));
  const checks = [
    { key: "address", label: "Dirección", group: "Contacto", done: !!p?.address },
    { key: "phone", label: "Teléfono", group: "Contacto", done: !!p?.phone },
    { key: "email", label: "Correo", group: "Contacto", done: !!p?.email },
    { key: "about", label: "Presentación", group: "Comunicación", done: !!p?.aboutText },
    { key: "schedule", label: "Horarios", group: "Comunicación", done: !!p?.scheduleText },
    { key: "colors", label: "Colores propios", group: "Identidad", done: customColors },
    { key: "logo", label: "Logotipo", group: "Identidad", done: !!p?.logoPath },
    { key: "code", label: "Código interno", group: "Identidad", done: !!church.code },
    { key: "team", label: "Equipo asignado", group: "Equipo", done: church.teamCount > 0 },
  ];
  const done = checks.filter((c) => c.done).length;
  return { checks, done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const INSIGHT_ORDER = ["danger", "warning", "info"] as const;

export type NetworkInsight = { tone: (typeof INSIGHT_ORDER)[number]; title: string; detail: string; churchId?: string };

export async function getNetworkOverview(actor: Actor | null) {
  requirePermission(actor, "churches:read");
  const [franchises, churches] = await Promise.all([
    db.franchise.findMany({
      select: { id: true, name: true, slug: true, description: true, isActive: true, createdAt: true },
      orderBy: { name: "asc" },
    }),
    db.church.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        code: true,
        isActive: true,
        createdAt: true,
        franchiseId: true,
        profile: {
          select: {
            address: true,
            phone: true,
            email: true,
            aboutText: true,
            scheduleText: true,
            logoPath: true,
            primaryColor: true,
            accentColor: true,
            currency: true,
          },
        },
        _count: { select: { memberships: true, roleAssignments: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const sedes = churches.map((c) => ({
    ...c,
    team: c._count.memberships,
    roles: c._count.roleAssignments,
    readiness: churchReadiness({ code: c.code, profile: c.profile, teamCount: c._count.memberships }),
  }));
  const active = sedes.filter((c) => c.isActive);

  // Crecimiento: iglesias dadas de alta en los últimos 12 meses.
  const now = new Date();
  const growth = Array.from({ length: 12 }, (_, i) => {
    const from = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    return {
      label: MONTHS[from.getMonth()],
      value: sedes.filter((c) => c.createdAt >= from && c.createdAt < to).length,
    };
  });

  // Acciones recomendadas, priorizadas por impacto.
  const insights: NetworkInsight[] = [];
  for (const c of active) {
    if (c.team === 0) {
      insights.push({ tone: "danger", title: `${c.name} no tiene equipo asignado`, detail: "Asigna al menos un responsable para que la sede pueda operar.", churchId: c.id });
    } else if (!c.profile?.phone && !c.profile?.email) {
      insights.push({ tone: "warning", title: `${c.name} no tiene datos de contacto`, detail: "Agrega teléfono o correo para que la gente pueda comunicarse.", churchId: c.id });
    } else if (c.readiness.percent < 60) {
      insights.push({ tone: "info", title: `${c.name} está al ${c.readiness.percent} %`, detail: "Completa su presentación, horarios e identidad visual.", churchId: c.id });
    }
  }
  for (const f of franchises) {
    if (f.isActive && !active.some((c) => c.franchiseId === f.id)) {
      insights.push({ tone: "warning", title: `La franquicia ${f.name} no tiene sedes activas`, detail: "Agrega una iglesia o reactiva alguna de sus sedes." });
    }
  }
  insights.sort((x, y) => INSIGHT_ORDER.indexOf(x.tone) - INSIGHT_ORDER.indexOf(y.tone));

  return {
    franchises: franchises.map((f) => ({ ...f, churches: sedes.filter((c) => c.franchiseId === f.id) })),
    churches: sedes,
    totals: {
      franchises: franchises.filter((f) => f.isActive).length,
      churches: sedes.length,
      active: active.length,
      inactive: sedes.length - active.length,
      team: sedes.reduce((s, c) => s + c.team, 0),
      avgReadiness: active.length ? Math.round(active.reduce((s, c) => s + c.readiness.percent, 0) / active.length) : 0,
      ready: active.filter((c) => c.readiness.percent >= 80).length,
    },
    growth,
    insights,
  };
}

// ───── Ficha de una iglesia ─────

export async function getChurchDetail(actor: Actor | null, id: string) {
  const a = requirePermission(actor, "churches:read");
  const church = await db.church.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      franchise: { select: { id: true, name: true, _count: { select: { churches: true } } } },
      profile: { include: { updatedBy: { select: { name: true } } } },
      memberships: {
        select: { isPrimary: true, createdAt: true, user: { select: { id: true, name: true, email: true, isActive: true } } },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      roleAssignments: {
        select: { userId: true, role: { select: { id: true, key: true, name: true, hierarchyLevel: true } } },
        orderBy: { role: { hierarchyLevel: "desc" } },
      },
    },
  });
  if (!church) throw new AppError("NOT_FOUND", "Iglesia no encontrada.");

  const team = church.memberships.map((m) => ({
    ...m.user,
    isPrimary: m.isPrimary,
    since: m.createdAt,
    roles: church.roleAssignments.filter((r) => r.userId === m.user.id).map((r) => r.role),
  }));
  const readiness = churchReadiness({ code: church.code, profile: church.profile, teamCount: team.length });
  // Una iglesia y una capilla con el mismo código son la misma sede: la capilla da el sitio público y la operación.
  const chapel = church.code
    ? await db.chapel.findUnique({ where: { code: church.code }, select: { id: true, code: true, isPublic: true, status: true } })
    : null;
  const history = can(a, "audit:read")
    ? await db.auditLog.findMany({
        where: { entityType: "Church", entityId: id },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { actor: { select: { name: true } } },
      })
    : null;

  return { church, team, readiness, history, chapel };
}

function maxLevel(actor: Actor) {
  return Math.max(0, ...actor.roles.map((r) => ROLES[r]?.level ?? 0));
}

/** Usuarios y roles que el actor puede asignar a una sede (nunca a sí mismo ni roles por encima de su nivel). */
export async function churchTeamOptions(actor: Actor | null, churchId: string) {
  const a = requirePermission(actor, "churches:manage_members");
  const [users, roles] = await Promise.all([
    db.user.findMany({
      where: { isActive: true, id: { not: a.userId }, churchMemberships: { none: { churchId } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    db.role.findMany({
      where: { hierarchyLevel: { lte: maxLevel(a) } },
      orderBy: { hierarchyLevel: "desc" },
      select: { id: true, name: true },
    }),
  ]);
  return { users, roles };
}

export async function addChurchTeamMember(actor: Actor | null, churchId: string, input: unknown) {
  const a = requirePermission(actor, "churches:manage_members");
  const data = parseInput(churchTeamSchema, input);
  if (data.userId === a.userId) throw new AppError("FORBIDDEN", "No puedes asignarte a ti mismo a una sede ni darte roles.");

  await db.$transaction(async (tx) => {
    const [church, user] = await Promise.all([
      tx.church.findUnique({ where: { id: churchId }, select: { isActive: true } }),
      tx.user.findUnique({ where: { id: data.userId }, select: { isActive: true } }),
    ]);
    if (!church) throw new AppError("NOT_FOUND", "Iglesia no encontrada.");
    if (!church.isActive) throw new AppError("CONFLICT", "La iglesia está inactiva; reactívala para asignar equipo.");
    if (!user?.isActive) throw new AppError("NOT_FOUND", "El usuario no existe o está inactivo.");

    let roleName: string | null = null;
    if (data.roleId) {
      const role = await tx.role.findUnique({ where: { id: data.roleId }, select: { id: true, name: true, hierarchyLevel: true } });
      if (!role) throw new AppError("NOT_FOUND", "El rol no existe.");
      if (role.hierarchyLevel > maxLevel(a)) throw new AppError("FORBIDDEN", "No puedes asignar un rol de mayor jerarquía que el tuyo.");
      await tx.churchRoleAssignment.upsert({
        where: { userId_churchId_roleId: { userId: data.userId, churchId, roleId: role.id } },
        update: {},
        create: { userId: data.userId, churchId, roleId: role.id, assignedById: a.userId },
      });
      roleName = role.name;
    }
    if (data.isPrimary) await tx.churchMembership.updateMany({ where: { userId: data.userId }, data: { isPrimary: false } });
    await tx.churchMembership.upsert({
      where: { userId_churchId: { userId: data.userId, churchId } },
      update: { isPrimary: data.isPrimary },
      create: { userId: data.userId, churchId, isPrimary: data.isPrimary },
    });
    await recordAudit(tx, a, {
      action: "church.member_add",
      entityType: "Church",
      entityId: churchId,
      metadata: { userId: data.userId, role: roleName, isPrimary: data.isPrimary },
    });
  });
}

export async function removeChurchTeamMember(actor: Actor | null, churchId: string, userId: string) {
  const a = requirePermission(actor, "churches:manage_members");
  if (userId === a.userId) throw new AppError("FORBIDDEN", "No puedes quitarte a ti mismo de una sede.");
  await db.$transaction(async (tx) => {
    const removed = await tx.churchMembership.deleteMany({ where: { userId, churchId } });
    if (!removed.count) throw new AppError("NOT_FOUND", "Esa persona no forma parte del equipo.");
    await tx.churchRoleAssignment.deleteMany({ where: { userId, churchId } });
    await recordAudit(tx, a, { action: "church.member_end", entityType: "Church", entityId: churchId, metadata: { userId } });
  });
}

export async function setChurchStatus(actor: Actor | null, churchId: string, input: unknown) {
  const a = requirePermission(actor, "churches:update");
  const { isActive, reason } = parseInput(churchStatusSchema, input);
  if (!isActive && !reason) throw new AppError("VALIDATION_ERROR", "Indica el motivo para desactivar la iglesia.", { reason: ["Indica el motivo."] });
  await db.$transaction(async (tx) => {
    const church = await tx.church.findUnique({ where: { id: churchId }, select: { isActive: true } });
    if (!church) throw new AppError("NOT_FOUND", "Iglesia no encontrada.");
    if (church.isActive === isActive) return;
    await tx.church.update({ where: { id: churchId }, data: { isActive } });
    await recordAudit(tx, a, {
      action: isActive ? "church.activate" : "church.deactivate",
      entityType: "Church",
      entityId: churchId,
      metadata: { reason: reason ?? null },
    });
  });
}
