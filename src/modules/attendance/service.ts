import { recordAudit } from "@/lib/audit";
import { requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import { attendanceBatchSchema, attendanceInputSchema } from "./schema";

export async function getEventAttendance(actor: Actor | null, eventId: string) {
  requirePermission(actor, "attendance:read");
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, visitorCount: true } });
  if (!event) throw new AppError("NOT_FOUND", "Evento no encontrado.");
  const [members, records] = await Promise.all([
    db.member.findMany({ where: { status: { not: "INACTIVE" } }, select: { id: true, firstName: true, lastName: true, status: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    db.attendance.findMany({ where: { eventId }, select: { memberId: true, status: true, updatedAt: true } }),
  ]);
  const byMember = new Map(records.map((record) => [record.memberId, record]));
  return { event, data: members.map((member) => ({ ...member, attendance: byMember.get(member.id)?.status ?? null, updatedAt: byMember.get(member.id)?.updatedAt ?? null })) };
}

export async function recordAttendance(actor: Actor | null, eventId: string, input: unknown) {
  const a = requirePermission(actor, "attendance:record");
  const data = parseInput(attendanceInputSchema, input);
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw new AppError("NOT_FOUND", "Evento no encontrado.");
  const current = await db.attendance.findUnique({ where: { eventId_memberId: { eventId, memberId: data.memberId } }, select: { id: true } });
  if (current) requirePermission(a, "attendance:update");
  await db.attendance.upsert({ where: { eventId_memberId: { eventId, memberId: data.memberId } }, create: { eventId, memberId: data.memberId, status: data.status, recordedById: a.userId }, update: { status: data.status, recordedById: a.userId } });
  await recordAudit(db, a, { action: current ? "attendance.update" : "attendance.record", entityType: "Attendance", entityId: `${eventId}:${data.memberId}`, metadata: { status: data.status } });
  return getEventAttendance(a, eventId);
}

export async function recordAttendanceBatch(actor: Actor | null, eventId: string, input: unknown) {
  const a = requirePermission(actor, "attendance:record");
  const { records } = parseInput(attendanceBatchSchema, input);
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw new AppError("NOT_FOUND", "Evento no encontrado.");
  await db.$transaction(async (tx) => {
    for (const record of records) {
      const current = await tx.attendance.findUnique({ where: { eventId_memberId: { eventId, memberId: record.memberId } }, select: { id: true } });
      if (current) requirePermission(a, "attendance:update");
      await tx.attendance.upsert({ where: { eventId_memberId: { eventId, memberId: record.memberId } }, create: { eventId, memberId: record.memberId, status: record.status, recordedById: a.userId }, update: { status: record.status, recordedById: a.userId } });
    }
    await recordAudit(tx, a, { action: "attendance.batch_update", entityType: "Event", entityId: eventId, metadata: { count: records.length } });
  });
  return getEventAttendance(a, eventId);
}
