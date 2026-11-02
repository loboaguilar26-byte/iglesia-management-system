import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { can, canFully, requirePermission, type Actor } from "@/lib/authz";
import { zonedToUtc } from "@/lib/dates";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import type { AnnouncementStatus, Prisma } from "@/generated/prisma/client";
import { getChurchTimezone } from "../settings/service";

const bool = z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean());

const schema = z.object({
  title: z.string().trim().min(3, "Escribe un título").max(150),
  body: z.string().trim().min(3, "Escribe el contenido").max(10000),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
  isFeatured: bool,
  expiresOn: z.string().optional().refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida"),
  publish: bool,
});

export const ANNOUNCEMENT_STATUS_LABEL = { DRAFT: "Borrador", PUBLISHED: "Publicado", ARCHIVED: "Archivado" } as const;

export async function listAnnouncements(actor: Actor | null, status?: AnnouncementStatus) {
  requirePermission(actor, "announcements:read");
  return db.announcement.findMany({
    where: status ? { status } : { status: { not: "ARCHIVED" } },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    include: { author: { select: { name: true } } },
    take: 100,
  });
}

/** Comunicados vigentes para el panel interno (públicos e internos). */
export async function currentAnnouncements(actor: Actor | null, take = 5) {
  requirePermission(actor, "announcements:read");
  const now = new Date();
  return db.announcement.findMany({
    where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take,
    select: { id: true, title: true, body: true, isFeatured: true, visibility: true, publishedAt: true },
  });
}

export async function getAnnouncement(actor: Actor | null, id: string) {
  requirePermission(actor, "announcements:read");
  const a = await db.announcement.findUnique({ where: { id }, include: { author: { select: { name: true } } } });
  if (!a) throw new AppError("NOT_FOUND", "Comunicado no encontrado.");
  return a;
}

async function toData(input: unknown) {
  const d = parseInput(schema, input);
  const tz = await getChurchTimezone();
  // Vigente hasta el final del día indicado (hora de la iglesia).
  const expiresAt = d.expiresOn ? zonedToUtc(`${d.expiresOn}T23:59`, tz) : null;
  return { title: d.title, body: d.body, visibility: d.visibility, isFeatured: d.isFeatured, expiresAt, publish: d.publish };
}

/** Un coordinador (permiso acotado) solo edita sus propios comunicados. */
function assertCanEdit(a: Actor, authorId: string) {
  if (!canFully(a, "announcements:update") && authorId !== a.userId) throw new AppError("FORBIDDEN", "Solo puedes editar tus propios comunicados.");
}

export async function createAnnouncement(actor: Actor | null, input: unknown) {
  const a = requirePermission(actor, "announcements:create");
  const { publish, ...data } = await toData(input);
  if (publish && !can(a, "announcements:publish")) throw new AppError("FORBIDDEN", "No tienes permiso para publicar; guarda como borrador.");
  return db.$transaction(async (tx) => {
    const row = await tx.announcement.create({
      data: { ...data, authorId: a.userId, status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? new Date() : null },
    });
    await recordAudit(tx, a, { action: publish ? "announcement.publish" : "announcement.create", entityType: "Announcement", entityId: row.id });
    return row;
  });
}

export async function updateAnnouncement(actor: Actor | null, id: string, input: unknown) {
  const a = requirePermission(actor, "announcements:update");
  const current = await db.announcement.findUnique({ where: { id }, select: { authorId: true, status: true } });
  if (!current) throw new AppError("NOT_FOUND", "Comunicado no encontrado.");
  assertCanEdit(a, current.authorId);
  const { publish, ...data } = await toData(input);
  const willPublish = publish && current.status !== "PUBLISHED";
  if (willPublish && !can(a, "announcements:publish")) throw new AppError("FORBIDDEN", "No tienes permiso para publicar.");
  const statusData: Prisma.AnnouncementUpdateInput = willPublish ? { status: "PUBLISHED", publishedAt: new Date() } : {};
  await db.$transaction(async (tx) => {
    await tx.announcement.update({ where: { id }, data: { ...data, ...statusData } });
    await recordAudit(tx, a, { action: willPublish ? "announcement.publish" : "announcement.update", entityType: "Announcement", entityId: id });
  });
}

export async function setAnnouncementStatus(actor: Actor | null, id: string, status: AnnouncementStatus) {
  const a = requirePermission(actor, status === "ARCHIVED" ? "announcements:archive" : "announcements:publish");
  await db.$transaction(async (tx) => {
    const current = await tx.announcement.findUnique({ where: { id }, select: { publishedAt: true } });
    if (!current) throw new AppError("NOT_FOUND", "Comunicado no encontrado.");
    await tx.announcement.update({
      where: { id },
      data: { status, ...(status === "PUBLISHED" && !current.publishedAt ? { publishedAt: new Date() } : {}) },
    });
    await recordAudit(tx, a, { action: `announcement.${status.toLowerCase()}`, entityType: "Announcement", entityId: id });
  });
}

export async function deleteAnnouncement(actor: Actor | null, id: string) {
  const a = requirePermission(actor, "announcements:delete");
  await db.$transaction(async (tx) => {
    const current = await tx.announcement.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw new AppError("NOT_FOUND", "Comunicado no encontrado.");
    await tx.announcement.delete({ where: { id } });
    await recordAudit(tx, a, { action: "announcement.delete", entityType: "Announcement", entityId: id });
  });
}
