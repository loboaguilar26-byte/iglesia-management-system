import { recordAudit } from "@/lib/audit";
import { can, requireActor, requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizeSearch } from "@/lib/text";
import { parseInput } from "@/lib/validation";
import type { MemberStatus, Prisma } from "@/generated/prisma/client";
import { memberScopeWhere } from "../scope";
import { listMembersSchema, memberSchema } from "./schema";

const fullName = (m: { firstName: string; lastName: string }) => `${m.firstName} ${m.lastName}`;

export async function listMembers(actor: Actor | null, input: unknown) {
  const a = requirePermission(actor, "members:read");
  const { q, status, ministryId, page, pageSize } = parseInput(listMembersSchema, input ?? {});
  const scope = await memberScopeWhere(a, "members:read");
  const where: Prisma.MemberWhereInput = {
    AND: [
      scope ?? {},
      q ? { searchName: { contains: normalizeSearch(q) } } : {},
      status ? { status } : {},
      ministryId ? { ministryMemberships: { some: { ministryId, endDate: null } } } : {},
    ],
  };
  const [rows, total] = await Promise.all([
    db.member.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        status: true,
        joinDate: true,
        position: true,
        isMinor: true,
        ministryMemberships: { where: { endDate: null }, select: { ministry: { select: { name: true } } } },
      },
    }),
    db.member.count({ where }),
  ]);
  return { data: rows, meta: { page, pageSize, total } };
}

export async function getMember(actor: Actor | null, id: string) {
  const a = requirePermission(actor, "members:read");
  const scope = await memberScopeWhere(a, "members:read");
  const member = await db.member.findFirst({
    where: { id, ...(scope ?? {}) },
    include: {
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
      user: { select: { id: true, email: true, isActive: true } },
      ministryMemberships: {
        orderBy: [{ endDate: { sort: "asc", nulls: "first" } }, { startDate: "desc" }],
        include: { ministry: { select: { id: true, name: true } } },
      },
    },
  });
  if (!member) throw new AppError("NOT_FOUND", "Miembro no encontrado.");
  const attendance = can(a, "attendance:read")
    ? await db.attendance.findMany({
        where: { memberId: id },
        orderBy: { event: { startsAt: "desc" } },
        take: 15,
        select: { status: true, event: { select: { id: true, title: true, startsAt: true } } },
      })
    : null;
  const { notes, ...rest } = member;
  return { ...rest, notes: can(a, "members:read_notes") ? notes : undefined, attendance };
}

async function findDuplicate(tx: Prisma.TransactionClient, data: { firstName: string; lastName: string; phone: string | null; email: string | null }, excludeId?: string) {
  const searchName = normalizeSearch(fullName(data));
  // Mismo nombre y mismo teléfono o correo; sin datos de contacto, basta el nombre.
  const or: Prisma.MemberWhereInput[] = [];
  if (data.phone) or.push({ searchName, phone: data.phone });
  if (data.email) or.push({ searchName, email: { equals: data.email, mode: "insensitive" } });
  if (!data.phone && !data.email) or.push({ searchName });
  return tx.member.findFirst({
    where: { id: excludeId ? { not: excludeId } : undefined, OR: or },
    select: { id: true, firstName: true, lastName: true },
  });
}

async function assertEmailFree(tx: Prisma.TransactionClient, email: string | null, excludeId?: string) {
  if (!email) return;
  const taken = await tx.member.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, id: excludeId ? { not: excludeId } : undefined },
    select: { id: true },
  });
  if (taken) throw new AppError("CONFLICT", "Ya existe un miembro con ese correo.", { email: ["Correo ya registrado"] });
}

export async function createMember(actor: Actor | null, input: unknown) {
  const a = requirePermission(actor, "members:create");
  const { confirmDuplicate, notes, ...data } = parseInput(memberSchema, input);
  return db.$transaction(async (tx) => {
    await assertEmailFree(tx, data.email);
    const dup = await findDuplicate(tx, data);
    if (dup && !confirmDuplicate) {
      throw new AppError("CONFLICT", `Posible duplicado: ya existe "${fullName(dup)}". Revisa o marca “Registrar de todos modos”.`, {
        confirmDuplicate: ["Confirma si se trata de otra persona."],
      });
    }
    const member = await tx.member.create({
      data: {
        ...data,
        notes: can(a, "members:read_notes") ? notes : null,
        searchName: normalizeSearch(fullName(data)),
        createdById: a.userId,
        updatedById: a.userId,
      },
    });
    await recordAudit(tx, a, { action: "member.create", entityType: "Member", entityId: member.id });
    return member;
  });
}

export async function updateMember(actor: Actor | null, id: string, input: unknown) {
  const a = requirePermission(actor, "members:update");
  const { confirmDuplicate, notes, ...data } = parseInput(memberSchema, input);
  return db.$transaction(async (tx) => {
    const before = await tx.member.findUnique({ where: { id } });
    if (!before) throw new AppError("NOT_FOUND", "Miembro no encontrado.");
    if (data.status !== before.status && !can(a, "members:deactivate") && (data.status === "INACTIVE" || before.status === "INACTIVE")) {
      throw new AppError("FORBIDDEN", "No tienes permiso para activar o desactivar miembros.");
    }
    await assertEmailFree(tx, data.email, id);
    const dup = await findDuplicate(tx, data, id);
    if (dup && !confirmDuplicate) {
      throw new AppError("CONFLICT", `Posible duplicado: ya existe "${fullName(dup)}".`, { confirmDuplicate: ["Confirma si se trata de otra persona."] });
    }
    const changed = (Object.keys(data) as (keyof typeof data)[]).filter((k) => String(before[k] ?? "") !== String(data[k] ?? ""));
    const member = await tx.member.update({
      where: { id },
      data: {
        ...data,
        ...(can(a, "members:read_notes") ? { notes } : {}),
        searchName: normalizeSearch(fullName(data)),
        updatedById: a.userId,
      },
    });
    await recordAudit(tx, a, { action: "member.update", entityType: "Member", entityId: id, metadata: { changed } });
    return member;
  });
}

export async function setMemberStatus(actor: Actor | null, id: string, status: MemberStatus) {
  const a = requirePermission(actor, "members:deactivate");
  await db.$transaction(async (tx) => {
    const before = await tx.member.findUnique({ where: { id }, select: { status: true } });
    if (!before) throw new AppError("NOT_FOUND", "Miembro no encontrado.");
    await tx.member.update({ where: { id }, data: { status, updatedById: a.userId } });
    await recordAudit(tx, a, { action: "member.status", entityType: "Member", entityId: id, metadata: { before: before.status, after: status } });
  });
}

/**
 * Búsqueda mínima (id y nombre) para selectores: asistencia, ministerios, responsables y donantes.
 * No expone teléfonos ni correos.
 */
export async function lookupMembers(actor: Actor | null, q: string, { includeInactive = false } = {}) {
  const a = requireActor(actor);
  const allowed = (["members:read", "finance:create", "attendance:record", "ministries:manage_members", "events:update"] as const).some((p) => can(a, p));
  if (!allowed) throw new AppError("FORBIDDEN");
  const term = normalizeSearch(q);
  const rows = await db.member.findMany({
    where: {
      ...(term ? { searchName: { contains: term } } : {}),
      ...(includeInactive ? {} : { status: { not: "INACTIVE" } }),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 20,
    select: { id: true, firstName: true, lastName: true },
  });
  return rows.map((m) => ({ id: m.id, name: fullName(m) }));
}
