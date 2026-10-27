import { recordAudit } from "@/lib/audit";
import { requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalizeEmail, normalizeSearch } from "@/lib/text";
import { parseInput } from "@/lib/validation";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { listMembersSchema, memberInputSchema, normalizedMemberName } from "./schema";

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  searchName: true,
  phone: true,
  email: true,
  joinDate: true,
  status: true,
  position: true,
  isMinor: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MemberSelect;
type MemberRow = Prisma.MemberGetPayload<{ select: typeof memberSelect }>;

export type MemberDto = Omit<MemberRow, "notes"> & { notes: string | null };

function toDto(row: MemberRow, canReadNotes: boolean): MemberDto {
  return { ...row, notes: canReadNotes ? row.notes : null };
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new AppError("VALIDATION_ERROR", "La fecha de ingreso no es válida.");
  return date;
}

function clean(value: string | undefined) { return value?.trim() || null; }

async function assertNoDuplicate(input: { firstName: string; lastName: string; phone?: string; email?: string }, id?: string) {
  const searchName = normalizedMemberName(input.firstName, input.lastName);
  const where: Prisma.MemberWhereInput = {
    id: id ? { not: id } : undefined,
    searchName,
    OR: [
      ...(input.phone ? [{ phone: input.phone }] : []),
      ...(input.email ? [{ email: input.email }] : []),
    ],
  };
  if (where.OR?.length && await db.member.findFirst({ where, select: { id: true } })) {
    throw new AppError("CONFLICT", "Ya existe un miembro con el mismo nombre y teléfono o correo.");
  }
  if (input.email && await db.member.findFirst({ where: { email: input.email, id: id ? { not: id } : undefined }, select: { id: true } })) {
    throw new AppError("CONFLICT", "Ya existe un miembro con ese correo.");
  }
}

export async function listMembers(actor: Actor | null, input: unknown) {
  const a = requirePermission(actor, "members:read");
  const { page, pageSize, q, status } = parseInput(listMembersSchema, input ?? {});
  const where: Prisma.MemberWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { searchName: { contains: normalizeSearch(q) } } : {}),
  };
  const [rows, total] = await Promise.all([
    db.member.findMany({ where, select: memberSelect, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
    db.member.count({ where }),
  ]);
  return { data: rows.map((row) => toDto(row, a.permissions.has("members:read_notes"))), meta: { page, pageSize, total } };
}

export async function getMember(actor: Actor | null, id: string) {
  const a = requirePermission(actor, "members:read");
  const row = await db.member.findUnique({ where: { id }, select: memberSelect });
  if (!row) throw new AppError("NOT_FOUND", "Miembro no encontrado.");
  return toDto(row, a.permissions.has("members:read_notes"));
}

export async function createMember(actor: Actor | null, input: unknown) {
  const a = requirePermission(actor, "members:create");
  const data = parseInput(memberInputSchema, input);
  const notes = a.permissions.has("members:read_notes") ? clean(data.notes) : null;
  const email = data.email ? normalizeEmail(data.email) : undefined;
  await assertNoDuplicate({ ...data, phone: clean(data.phone) ?? undefined, email }, undefined);
  const row = await db.$transaction(async (tx) => {
    const member = await tx.member.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        searchName: normalizedMemberName(data.firstName, data.lastName),
        phone: clean(data.phone),
        email: email || null,
        joinDate: parseDate(data.joinDate),
        status: data.status,
        position: clean(data.position),
        isMinor: data.isMinor,
        notes,
        createdById: a.userId,
      },
      select: { id: true },
    });
    await recordAudit(tx, a, { action: "member.create", entityType: "Member", entityId: member.id, metadata: { status: data.status, isMinor: data.isMinor } });
    return member.id;
  });
  return getMember(a, row);
}

export async function updateMember(actor: Actor | null, id: string, input: unknown) {
  const a = requirePermission(actor, "members:update");
  const data = parseInput(memberInputSchema, input);
  const existing = await db.member.findUnique({ where: { id }, select: { id: true, notes: true } });
  if (!existing) throw new AppError("NOT_FOUND", "Miembro no encontrado.");
  const email = data.email ? normalizeEmail(data.email) : undefined;
  await assertNoDuplicate({ ...data, phone: clean(data.phone) ?? undefined, email }, id);
  const notes = a.permissions.has("members:read_notes") ? clean(data.notes) : existing.notes;
  await db.$transaction(async (tx) => {
    await tx.member.update({ where: { id }, data: { firstName: data.firstName, lastName: data.lastName, searchName: normalizedMemberName(data.firstName, data.lastName), phone: clean(data.phone), email: email || null, joinDate: parseDate(data.joinDate), status: data.status, position: clean(data.position), isMinor: data.isMinor, notes, updatedById: a.userId } });
    await recordAudit(tx, a, { action: "member.update", entityType: "Member", entityId: id, metadata: { status: data.status } });
  });
  return getMember(a, id);
}

export async function setMemberActive(actor: Actor | null, id: string, input: unknown) {
  const a = requirePermission(actor, "members:deactivate");
  const { isActive } = parseInput(zSetActive, input);
  const member = await db.member.findUnique({ where: { id }, select: { id: true } });
  if (!member) throw new AppError("NOT_FOUND", "Miembro no encontrado.");
  await db.member.update({ where: { id }, data: { status: isActive ? "ACTIVE" : "INACTIVE", updatedById: a.userId } });
  await recordAudit(db, a, { action: isActive ? "member.activate" : "member.deactivate", entityType: "Member", entityId: id });
  return getMember(a, id);
}

const zSetActive = z.object({ isActive: z.boolean() });
