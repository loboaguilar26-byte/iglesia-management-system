import { recordAudit } from "@/lib/audit";
import { requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import { ministrySchema } from "./schema";

export function listMinistries(actor: Actor | null) {
  requirePermission(actor, "ministries:read");
  return db.ministry.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, description: true, isActive: true, isPublic: true, _count: { select: { memberships: true, events: true } } },
  });
}

export async function getMinistry(actor: Actor | null, id: string) {
  requirePermission(actor, "ministries:read");
  const ministry = await db.ministry.findUnique({
    where: { id },
    include: { memberships: { where: { endDate: null }, include: { member: { select: { id: true, firstName: true, lastName: true, status: true } } } }, events: { orderBy: { startsAt: "desc" }, take: 10, select: { id: true, title: true, startsAt: true, status: true } } },
  });
  if (!ministry) throw new AppError("NOT_FOUND", "Ministerio no encontrado.");
  return ministry;
}

export async function saveMinistry(actor: Actor | null, id: string | null, input: unknown) {
  const a = requirePermission(actor, id ? "ministries:update" : "ministries:create");
  const data = parseInput(ministrySchema, input);
  const clash = await db.ministry.findFirst({ where: { name: { equals: data.name, mode: "insensitive" }, id: id ? { not: id } : undefined } });
  if (clash) throw new AppError("CONFLICT", "Ya existe un ministerio con ese nombre.");
  return db.$transaction(async (tx) => {
    const row = id ? await tx.ministry.update({ where: { id }, data }) : await tx.ministry.create({ data });
    await recordAudit(tx, a, { action: id ? "ministry.update" : "ministry.create", entityType: "Ministry", entityId: row.id, metadata: { name: data.name } });
    return row;
  });
}

export async function setMinistryActive(actor: Actor | null, id: string, isActive: boolean) {
  const a = requirePermission(actor, "ministries:update");
  await db.ministry.update({ where: { id }, data: { isActive } });
  await recordAudit(db, a, { action: isActive ? "ministry.activate" : "ministry.deactivate", entityType: "Ministry", entityId: id });
}
