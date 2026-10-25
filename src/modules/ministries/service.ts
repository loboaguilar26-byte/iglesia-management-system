import { recordAudit } from "@/lib/audit";
import { canFully, requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import { coordinatedMinistryIds, requireMinistryScope } from "../scope";
import { addMembershipSchema, endMembershipSchema, ministrySchema } from "./schema";

export async function listMinistries(actor: Actor | null, { includeInactive = true } = {}) {
  const a = requirePermission(actor, "ministries:read");
  const scoped = !canFully(a, "ministries:read");
  const ids = scoped ? await coordinatedMinistryIds(a) : null;
  return db.ministry.findMany({
    where: { ...(ids ? { id: { in: ids } } : {}), ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      memberships: {
        where: { endDate: null },
        select: { role: true, member: { select: { firstName: true, lastName: true } } },
      },
      _count: { select: { events: true } },
    },
  });
}

export async function getMinistry(actor: Actor | null, id: string) {
  const a = await requireMinistryScope(actor, "ministries:read", id);
  const ministry = await db.ministry.findUnique({
    where: { id },
    include: {
      memberships: {
        orderBy: [{ endDate: { sort: "asc", nulls: "first" } }, { role: "desc" }, { member: { lastName: "asc" } }],
        include: { member: { select: { id: true, firstName: true, lastName: true, status: true } } },
      },
      events: {
        orderBy: { startsAt: "desc" },
        take: 10,
        select: { id: true, title: true, startsAt: true, status: true },
      },
    },
  });
  if (!ministry) throw new AppError("NOT_FOUND", "Ministerio no encontrado.");
  return { ministry, actor: a };
}

export async function saveMinistry(actor: Actor | null, id: string | null, input: unknown) {
  const a = requirePermission(actor, id ? "ministries:update" : "ministries:create");
  const data = parseInput(ministrySchema, input);
  const clash = await db.ministry.findFirst({ where: { name: { equals: data.name, mode: "insensitive" }, id: id ? { not: id } : undefined } });
  if (clash) throw new AppError("CONFLICT", "Ya existe un ministerio con ese nombre.", { name: ["Nombre en uso"] });
  return db.$transaction(async (tx) => {
    const row = id ? await tx.ministry.update({ where: { id }, data }) : await tx.ministry.create({ data });
    await recordAudit(tx, a, { action: id ? "ministry.update" : "ministry.create", entityType: "Ministry", entityId: row.id, metadata: { name: data.name } });
    return row;
  });
}

export async function setMinistryActive(actor: Actor | null, id: string, isActive: boolean) {
  const a = requirePermission(actor, "ministries:update");
  await db.$transaction(async (tx) => {
    await tx.ministry.update({ where: { id }, data: { isActive } });
    await recordAudit(tx, a, { action: isActive ? "ministry.activate" : "ministry.deactivate", entityType: "Ministry", entityId: id });
  });
}

export async function addMembership(actor: Actor | null, ministryId: string, input: unknown) {
  const a = await requireMinistryScope(actor, "ministries:manage_members", ministryId);
  const data = parseInput(addMembershipSchema, input);
  // Solo quien tiene el permiso completo designa coordinadores (evita que un coordinador designe a otros).
  if (data.role === "COORDINATOR" && !canFully(a, "ministries:manage_members")) {
    throw new AppError("FORBIDDEN", "Solo la dirección puede designar coordinadores.");
  }
  const active = await db.ministryMembership.findFirst({ where: { ministryId, memberId: data.memberId, endDate: null } });
  if (active) throw new AppError("CONFLICT", "Esa persona ya participa en este ministerio.", { memberId: ["Ya es integrante"] });
  const member = await db.member.findUnique({ where: { id: data.memberId }, select: { status: true } });
  if (!member) throw new AppError("VALIDATION_ERROR", "Persona no encontrada.", { memberId: ["Selecciona una persona"] });
  await db.$transaction(async (tx) => {
    const row = await tx.ministryMembership.create({ data: { ministryId, ...data } });
    await recordAudit(tx, a, { action: "ministry.member_add", entityType: "Ministry", entityId: ministryId, metadata: { membershipId: row.id, memberId: data.memberId, role: data.role } });
  });
}

export async function endMembership(actor: Actor | null, membershipId: string, input: unknown) {
  const membership = await db.ministryMembership.findUnique({ where: { id: membershipId } });
  if (!membership) throw new AppError("NOT_FOUND", "Participación no encontrada.");
  const a = await requireMinistryScope(actor, "ministries:manage_members", membership.ministryId);
  if (membership.role === "COORDINATOR" && !canFully(a, "ministries:manage_members")) {
    throw new AppError("FORBIDDEN", "Solo la dirección puede retirar coordinadores.");
  }
  const { endDate } = parseInput(endMembershipSchema, input);
  if (endDate < membership.startDate) throw new AppError("VALIDATION_ERROR", "La fecha de fin no puede ser anterior al inicio.");
  await db.$transaction(async (tx) => {
    await tx.ministryMembership.update({ where: { id: membershipId }, data: { endDate } });
    await recordAudit(tx, a, { action: "ministry.member_end", entityType: "Ministry", entityId: membership.ministryId, metadata: { membershipId } });
  });
}
