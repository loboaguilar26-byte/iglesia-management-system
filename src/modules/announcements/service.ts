import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { can, requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import type { AnnouncementStatus, Prisma } from "@/generated/prisma/client";

const inputSchema = z.object({
  title: z.string().trim().min(3, "Escribe un título").max(150),
  body: z.string().trim().min(3, "Escribe el contenido").max(10000),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
  isFeatured: z.preprocess((value) => value === "on" || value === true || value === "true", z.boolean()),
  expiresOn: z.string().optional().refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Fecha inválida"),
  publish: z.preprocess((value) => value === "on" || value === true || value === "true", z.boolean()),
});

export function listAnnouncements(actor: Actor | null, status?: AnnouncementStatus) {
  requirePermission(actor, "announcements:read");
  return db.announcement.findMany({ where: status ? { status } : { status: { not: "ARCHIVED" } }, orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }], include: { author: { select: { name: true } } }, take: 100 });
}

export async function getAnnouncement(actor: Actor | null, id: string) {
  requirePermission(actor, "announcements:read");
  const row = await db.announcement.findUnique({ where: { id }, include: { author: { select: { name: true } } } });
  if (!row) throw new AppError("NOT_FOUND", "Comunicado no encontrado.");
  return row;
}

function toData(input: unknown) {
  const data = parseInput(inputSchema, input);
  return {
    title: data.title,
    body: data.body,
    visibility: data.visibility,
    isFeatured: data.isFeatured,
    expiresAt: data.expiresOn ? new Date(`${data.expiresOn}T23:59:59.999Z`) : null,
    publish: data.publish,
  };
}

export async function createAnnouncement(actor: Actor | null, input: unknown) {
  const a = requirePermission(actor, "announcements:create");
  const { publish, ...data } = toData(input);
  if (publish && !can(a, "announcements:publish")) throw new AppError("FORBIDDEN", "No tienes permiso para publicar.");
  const row = await db.$transaction(async (tx) => {
    const created = await tx.announcement.create({ data: { ...data, authorId: a.userId, status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? new Date() : null } });
    await recordAudit(tx, a, { action: publish ? "announcement.publish" : "announcement.create", entityType: "Announcement", entityId: created.id });
    return created;
  });
  return row;
}

export async function updateAnnouncement(actor: Actor | null, id: string, input: unknown) {
  const a = requirePermission(actor, "announcements:update");
  const current = await db.announcement.findUnique({ where: { id }, select: { authorId: true, status: true } });
  if (!current) throw new AppError("NOT_FOUND", "Comunicado no encontrado.");
  if (current.authorId !== a.userId && !can(a, "announcements:publish")) throw new AppError("FORBIDDEN", "No puedes editar este comunicado.");
  const { publish, ...data } = toData(input);
  if (publish && !can(a, "announcements:publish")) throw new AppError("FORBIDDEN", "No tienes permiso para publicar.");
  const statusData: Prisma.AnnouncementUpdateInput = publish ? { status: "PUBLISHED", publishedAt: current.status === "PUBLISHED" ? undefined : new Date() } : {};
  await db.announcement.update({ where: { id }, data: { ...data, ...statusData } });
  await recordAudit(db, a, { action: publish ? "announcement.publish" : "announcement.update", entityType: "Announcement", entityId: id });
}

export async function setAnnouncementStatus(actor: Actor | null, id: string, status: AnnouncementStatus) {
  const a = requirePermission(actor, status === "ARCHIVED" ? "announcements:archive" : "announcements:publish");
  await db.announcement.update({ where: { id }, data: { status, ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}) } });
  await recordAudit(db, a, { action: `announcement.${status.toLowerCase()}`, entityType: "Announcement", entityId: id });
}
