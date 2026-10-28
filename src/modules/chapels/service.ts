import { Decimal } from "decimal.js";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { can, requirePermission, type Actor } from "@/lib/authz";
import { db, type Tx } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { deleteStored, saveImage } from "@/lib/storage";
import { parseInput } from "@/lib/validation";
import type { ChapelStatus } from "@/generated/prisma/client";

export const CHAPEL_STATUS_LABEL: Record<ChapelStatus, string> = { ACTIVE: "Activa", INACTIVE: "Inactiva", ARCHIVED: "Archivada" };

const optional = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

const chapelSchema = z.object({
  name: z.string().trim().min(3, "Escribe el nombre de la capilla").max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,12}$/, "De 2 a 12 letras, números o guiones (p. ej. CAP-NORTE)"),
  address: optional(300),
  phone: optional(40),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .refine((v) => !v || z.email().safeParse(v).success, "Correo inválido")
    .transform((v) => (v ? v : null)),
  description: optional(2000),
  openedOn: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida")
    .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null)),
  managerMemberId: z.string().optional().transform((v) => (v ? v : null)),
  managerUserId: z.string().optional().transform((v) => (v ? v : null)),
});

const statusSchema = z
  .object({ status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]), reason: optional(500) })
  .refine((d) => d.status !== "ARCHIVED" || !!d.reason, { message: "Indica el motivo del archivo", path: ["reason"] });

/** Capillas activas para los selectores de personas, eventos, ministerios y aportaciones. */
export async function chapelOptions() {
  return db.chapel.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } });
}

/**
 * Valida que se pueda asignar un registro a la capilla: debe existir y estar activa
 * (se permite conservar la capilla actual aunque ya no esté activa, para no perder el historial).
 */
export async function assertChapelAssignable(client: typeof db | Tx, chapelId: string | null | undefined, current?: string | null) {
  if (!chapelId || chapelId === current) return;
  const chapel = await client.chapel.findUnique({ where: { id: chapelId }, select: { status: true } });
  if (!chapel) throw new AppError("VALIDATION_ERROR", undefined, { chapelId: ["Capilla inválida"] });
  if (chapel.status !== "ACTIVE") throw new AppError("VALIDATION_ERROR", "La capilla no está activa.", { chapelId: ["Solo se asignan registros a capillas activas"] });
}

export async function listChapels(actor: Actor | null, status?: ChapelStatus | "") {
  requirePermission(actor, "chapels:read");
  const chapels = await db.chapel.findMany({
    where: status ? { status } : { status: { not: "ARCHIVED" } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      managerMember: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { members: { where: { status: "ACTIVE" } }, ministries: { where: { isActive: true } } } },
    },
  });
  const upcoming = await db.event.groupBy({
    by: ["chapelId"],
    where: { chapelId: { in: chapels.map((c) => c.id) }, status: "SCHEDULED", startsAt: { gte: new Date() } },
    _count: true,
  });
  const counts = await db.chapel.groupBy({ by: ["status"], _count: true });
  return {
    chapels: chapels.map((c) => ({ ...c, upcomingEvents: upcoming.find((u) => u.chapelId === c.id)?._count ?? 0 })),
    counts: { ACTIVE: 0, INACTIVE: 0, ARCHIVED: 0, ...Object.fromEntries(counts.map((c) => [c.status, c._count])) } as Record<ChapelStatus, number>,
  };
}

/** Resumen de una capilla. Los bloques de finanzas e historial solo se calculan con permiso. */
export async function getChapelOverview(actor: Actor | null, id: string, now = new Date()) {
  const a = requirePermission(actor, "chapels:read");
  const chapel = await db.chapel.findUnique({
    where: { id },
    include: {
      managerMember: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      managerUser: { select: { id: true, name: true, email: true } },
    },
  });
  if (!chapel) throw new AppError("NOT_FOUND", "Capilla no encontrada.");

  const since30 = new Date(now.getTime() - 30 * 86400000);
  const [byStatus, ministries, upcoming, attendance30, visitors30] = await Promise.all([
    db.member.groupBy({ by: ["status"], where: { chapelId: id }, _count: true }),
    db.ministry.findMany({ where: { chapelId: id }, orderBy: { name: "asc" }, select: { id: true, name: true, isActive: true, _count: { select: { memberships: { where: { endDate: null } } } } } }),
    db.event.findMany({ where: { chapelId: id, status: "SCHEDULED", endsAt: { gte: now } }, orderBy: { startsAt: "asc" }, take: 6, select: { id: true, title: true, startsAt: true, location: true } }),
    db.attendance.count({ where: { status: "PRESENT", event: { chapelId: id, startsAt: { gte: since30, lte: now } } } }),
    db.event.aggregate({ where: { chapelId: id, status: { not: "CANCELLED" }, startsAt: { gte: since30, lte: now } }, _sum: { visitorCount: true } }),
  ]);
  const members = { ACTIVE: 0, VISITOR: 0, INACTIVE: 0, ...Object.fromEntries(byStatus.map((r) => [r.status, r._count])) } as Record<"ACTIVE" | "VISITOR" | "INACTIVE", number>;

  let finance: { monthTotal: string; yearTotal: string; monthly: { label: string; total: string }[] } | undefined;
  if (can(a, "finance:read")) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const sixAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
    const [month, year, rows] = await Promise.all([
      db.donation.aggregate({ where: { chapelId: id, status: "VALID", receivedAt: { gte: monthStart } }, _sum: { amount: true } }),
      db.donation.aggregate({ where: { chapelId: id, status: "VALID", receivedAt: { gte: yearStart } }, _sum: { amount: true } }),
      db.$queryRaw<{ month: Date; total: string }[]>`
        SELECT date_trunc('month', "receivedAt")::date AS month, SUM(amount)::text AS total
        FROM donation WHERE status = 'VALID' AND "chapelId" = ${id} AND "receivedAt" >= ${sixAgo}
        GROUP BY 1 ORDER BY 1`,
    ]);
    const names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    finance = {
      monthTotal: new Decimal(month._sum.amount?.toString() ?? 0).toFixed(2),
      yearTotal: new Decimal(year._sum.amount?.toString() ?? 0).toFixed(2),
      monthly: Array.from({ length: 6 }, (_, i) => {
        const d = new Date(Date.UTC(sixAgo.getUTCFullYear(), sixAgo.getUTCMonth() + i, 1));
        const r = rows.find((x) => new Date(x.month).getUTCFullYear() === d.getUTCFullYear() && new Date(x.month).getUTCMonth() === d.getUTCMonth());
        return { label: `${names[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, total: new Decimal(r?.total ?? 0).toFixed(2) };
      }),
    };
  }

  const history = can(a, "audit:read")
    ? await db.auditLog.findMany({ where: { entityType: "Chapel", entityId: id }, orderBy: { createdAt: "desc" }, take: 20, include: { actor: { select: { name: true } } } })
    : null;

  return { chapel, members, ministries, upcoming, attendance30, visitors30: visitors30._sum.visitorCount ?? 0, finance, history };
}

export async function chapelPeople(actor: Actor | null, id: string, page = 1) {
  requirePermission(actor, "chapels:read");
  requirePermission(actor, "members:read");
  const pageSize = 25;
  const where = { chapelId: id };
  const [rows, total] = await Promise.all([
    db.member.findMany({ where, orderBy: [{ status: "asc" }, { lastName: "asc" }], skip: (page - 1) * pageSize, take: pageSize, select: { id: true, firstName: true, lastName: true, status: true, phone: true, joinDate: true } }),
    db.member.count({ where }),
  ]);
  return { data: rows, meta: { page, pageSize, total } };
}

export async function chapelDonations(actor: Actor | null, id: string) {
  requirePermission(actor, "chapels:read");
  requirePermission(actor, "finance:read");
  return db.donation.findMany({
    where: { chapelId: id },
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: { concept: { select: { name: true } }, method: { select: { name: true } } },
  });
}

/** Usuarios activos que pueden quedar como gestores (solo para quien administra capillas). */
export async function managerUserOptions(actor: Actor | null) {
  requirePermission(actor, "chapels:manage");
  return db.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } });
}

export async function saveChapel(actor: Actor | null, id: string | null, input: unknown) {
  const a = requirePermission(actor, "chapels:manage");
  const data = parseInput(chapelSchema, input);
  const clash = await db.chapel.findFirst({
    where: { OR: [{ name: { equals: data.name, mode: "insensitive" } }, { code: data.code }], id: id ? { not: id } : undefined },
    select: { name: true, code: true },
  });
  if (clash) {
    throw new AppError("CONFLICT", "Ya existe una capilla con ese nombre o código.", clash.code === data.code ? { code: ["Código en uso"] } : { name: ["Nombre en uso"] });
  }
  if (id) {
    const current = await db.chapel.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new AppError("NOT_FOUND", "Capilla no encontrada.");
    if (current.status === "ARCHIVED") throw new AppError("CONFLICT", "Una capilla archivada no se edita; restáurala primero.");
  }
  return db.$transaction(async (tx) => {
    const row = id ? await tx.chapel.update({ where: { id }, data }) : await tx.chapel.create({ data });
    await recordAudit(tx, a, { action: id ? "chapel.update" : "chapel.create", entityType: "Chapel", entityId: row.id, metadata: { name: data.name, code: data.code } });
    return row;
  });
}

/** Alta / baja / archivo. Nunca se elimina: el historial (personas, eventos, ingresos) se conserva. */
export async function setChapelStatus(actor: Actor | null, id: string, input: unknown) {
  const a = requirePermission(actor, "chapels:manage");
  const { status, reason } = parseInput(statusSchema, input);
  await db.$transaction(async (tx) => {
    const current = await tx.chapel.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new AppError("NOT_FOUND", "Capilla no encontrada.");
    if (current.status === status) return;
    await tx.chapel.update({
      where: { id },
      data: { status, statusReason: reason, archivedAt: status === "ARCHIVED" ? new Date() : null },
    });
    await recordAudit(tx, a, {
      action: status === "ARCHIVED" ? "chapel.archive" : status === "ACTIVE" ? "chapel.activate" : "chapel.deactivate",
      entityType: "Chapel",
      entityId: id,
      metadata: { before: current.status, after: status, reason },
    });
  });
}

// ───── Identidad de la capilla (modelo de franquicia) ─────

const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal (#RRGGBB)");

const identitySchema = z.object({
  isPublic: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()),
  primaryColor: hex,
  accentColor: hex,
  tagline: optional(160),
  aboutText: optional(4000),
  scheduleText: optional(2000),
  mapUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine((v) => !v || /^https?:\/\/\S+$/.test(v), "Pega un enlace que empiece con https://")
    .transform((v) => (v ? v : null)),
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .optional()
    .refine((v) => !v || /^\+?[\d\s()-]{8,}$/.test(v), "Número inválido")
    .transform((v) => (v ? v : null)),
});

/** Colores, textos y enlaces de la página pública de la capilla. */
export async function saveChapelIdentity(actor: Actor | null, id: string, input: unknown) {
  const a = requirePermission(actor, "chapels:manage");
  const data = parseInput(identitySchema, input);
  await db.$transaction(async (tx) => {
    const current = await tx.chapel.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new AppError("NOT_FOUND", "Capilla no encontrada.");
    if (current.status === "ARCHIVED") throw new AppError("CONFLICT", "Una capilla archivada no se edita; restáurala primero.");
    await tx.chapel.update({ where: { id }, data });
    await recordAudit(tx, a, { action: "chapel.identity_update", entityType: "Chapel", entityId: id, metadata: { isPublic: data.isPublic } });
  });
}

/** Sustituye (o quita, con `file = null`) la portada de la capilla. */
export async function setChapelCover(actor: Actor | null, id: string, file: File | null) {
  const a = requirePermission(actor, "chapels:manage");
  const current = await db.chapel.findUnique({ where: { id }, select: { coverPath: true, status: true } });
  if (!current) throw new AppError("NOT_FOUND", "Capilla no encontrada.");
  if (current.status === "ARCHIVED") throw new AppError("CONFLICT", "Una capilla archivada no se edita; restáurala primero.");
  const name = file ? await saveImage(file, "chapel-cover") : null;
  await db.$transaction(async (tx) => {
    await tx.chapel.update({ where: { id }, data: { coverPath: name } });
    await recordAudit(tx, a, { action: name ? "chapel.cover_update" : "chapel.cover_remove", entityType: "Chapel", entityId: id, metadata: {} });
  });
  await deleteStored(current.coverPath);
}
