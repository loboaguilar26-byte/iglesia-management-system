import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { can, requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import type { AttendanceStatus, Prisma } from "@/generated/prisma/client";
import { eventScopeWhere, requireEventScope } from "../scope";

/** No se captura asistencia de eventos que empiezan más de 24 h en el futuro. */
const FUTURE_LIMIT_MS = 24 * 3600 * 1000;

export async function listAttendanceEvents(actor: Actor | null, { from, to }: { from: Date; to: Date }) {
  const a = requirePermission(actor, "attendance:read");
  const scope = await eventScopeWhere(a, "attendance:read");
  const events = await db.event.findMany({
    where: { AND: [scope ?? {}, { startsAt: { gte: from, lt: to } }, { status: { not: "CANCELLED" } }] },
    orderBy: { startsAt: "desc" },
    select: { id: true, title: true, startsAt: true, visitorCount: true, type: { select: { name: true } }, ministry: { select: { name: true } } },
  });
  const counts = await db.attendance.groupBy({
    by: ["eventId", "status"],
    where: { eventId: { in: events.map((e) => e.id) } },
    _count: true,
  });
  return events.map((e) => ({
    ...e,
    present: counts.find((c) => c.eventId === e.id && c.status === "PRESENT")?._count ?? 0,
    absent: counts.find((c) => c.eventId === e.id && c.status === "ABSENT")?._count ?? 0,
  }));
}

/** Hoja de asistencia: personas a considerar y su estado (sin registro = pendiente). */
export async function getAttendanceSheet(actor: Actor | null, eventId: string) {
  await requireEventScope(actor, "attendance:read", eventId);
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, startsAt: true, endsAt: true, status: true, visitorCount: true, ministryId: true, ministry: { select: { name: true } } },
  });
  if (!event) throw new AppError("NOT_FOUND", "Evento no encontrado.");
  const records = await db.attendance.findMany({ where: { eventId }, select: { memberId: true, status: true } });
  const recorded = new Map(records.map((r) => [r.memberId, r.status]));

  // Evento de un ministerio: sus integrantes vigentes; evento general: personas activas y visitantes.
  const base: Prisma.MemberWhereInput = event.ministryId
    ? { ministryMemberships: { some: { ministryId: event.ministryId, endDate: null } } }
    : { status: { in: ["ACTIVE", "VISITOR"] } };
  const people = await db.member.findMany({
    where: { OR: [base, { id: { in: [...recorded.keys()] } }] },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, status: true },
  });
  const rows = people.map((p) => ({ id: p.id, name: `${p.lastName}, ${p.firstName}`, isVisitor: p.status === "VISITOR", status: recorded.get(p.id) ?? null }));
  const summary = {
    present: records.filter((r) => r.status === "PRESENT").length,
    absent: records.filter((r) => r.status === "ABSENT").length,
    pending: rows.filter((r) => !r.status).length,
    visitors: event.visitorCount,
  };
  const tooEarly = event.startsAt.getTime() - Date.now() > FUTURE_LIMIT_MS;
  return { event, rows, summary, tooEarly };
}

const entrySchema = z.object({
  // Sin valor = no se modifica el conteo de visitantes del evento.
  visitorCount: z.coerce.number().int().min(0, "No puede ser negativo").max(100000).optional(),
  entries: z.array(z.object({ memberId: z.string().min(1), status: z.enum(["PRESENT", "ABSENT", ""]) })).max(5000),
});

/**
 * Guarda el pase de lista. Las marcas vacías dejan a la persona como pendiente.
 * Modificar o borrar una marca existente requiere `attendance:update` y queda auditado.
 */
export async function saveAttendance(actor: Actor | null, eventId: string, input: unknown) {
  const a = await requireEventScope(actor, "attendance:record", eventId);
  const { visitorCount, entries } = parseInput(entrySchema, input);
  const event = await db.event.findUnique({ where: { id: eventId }, select: { status: true, startsAt: true, visitorCount: true, ministryId: true } });
  if (!event) throw new AppError("NOT_FOUND", "Evento no encontrado.");
  if (event.status === "CANCELLED") throw new AppError("CONFLICT", "No se registra asistencia de eventos cancelados.");
  if (event.startsAt.getTime() - Date.now() > FUTURE_LIMIT_MS) throw new AppError("CONFLICT", "Aún no se puede registrar la asistencia de este evento.");

  const memberIds = [...new Set(entries.map((entry) => entry.memberId))];
  if (memberIds.length) {
    const eligibleMembers: Prisma.MemberWhereInput = event.ministryId
      ? { ministryMemberships: { some: { ministryId: event.ministryId, endDate: null } } }
      : { status: { in: ["ACTIVE", "VISITOR"] } };
    const authorizedCount = await db.member.count({
      where: {
        id: { in: memberIds },
        OR: [eligibleMembers, { attendances: { some: { eventId } } }],
      },
    });
    if (authorizedCount !== memberIds.length) throw new AppError("FORBIDDEN");
  }

  const existing = new Map((await db.attendance.findMany({ where: { eventId }, select: { memberId: true, status: true } })).map((r) => [r.memberId, r.status]));
  const creates: { memberId: string; status: AttendanceStatus }[] = [];
  const changes: { memberId: string; from: AttendanceStatus; to: AttendanceStatus | null }[] = [];
  for (const { memberId, status } of entries) {
    const prev = existing.get(memberId);
    if (!prev && status) creates.push({ memberId, status });
    else if (prev && prev !== (status || null)) changes.push({ memberId, from: prev, to: status || null });
  }
  if (changes.length && !can(a, "attendance:update")) {
    throw new AppError("FORBIDDEN", "No tienes permiso para corregir asistencia ya registrada.");
  }
  await db.$transaction(async (tx) => {
    if (creates.length) {
      await tx.attendance.createMany({ data: creates.map((c) => ({ ...c, eventId, recordedById: a.userId })), skipDuplicates: true });
    }
    for (const c of changes) {
      if (c.to) await tx.attendance.update({ where: { eventId_memberId: { eventId, memberId: c.memberId } }, data: { status: c.to, recordedById: a.userId } });
      else await tx.attendance.delete({ where: { eventId_memberId: { eventId, memberId: c.memberId } } });
    }
    if (visitorCount !== undefined && visitorCount !== event.visitorCount) await tx.event.update({ where: { id: eventId }, data: { visitorCount } });
    await recordAudit(tx, a, {
      action: changes.length ? "attendance.correct" : "attendance.record",
      entityType: "Event",
      entityId: eventId,
      metadata: { created: creates.length, changes, visitorCount },
    });
  });
  return { created: creates.length, changed: changes.length };
}
