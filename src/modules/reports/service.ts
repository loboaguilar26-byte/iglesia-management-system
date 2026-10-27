import { requirePermission, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";

export async function getOperationalReport(actor: Actor | null) {
  requirePermission(actor, "reports:members");
  const [members, visitors, activeMembers, events, upcomingEvents, ministries, attendance] = await Promise.all([
    db.member.count(),
    db.member.count({ where: { status: "VISITOR" } }),
    db.member.count({ where: { status: "ACTIVE" } }),
    db.event.count(),
    db.event.count({ where: { startsAt: { gte: new Date() }, status: "SCHEDULED" } }),
    db.ministry.count({ where: { isActive: true } }),
    db.attendance.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const present = attendance.find((row) => row.status === "PRESENT")?._count._all ?? 0;
  const absent = attendance.find((row) => row.status === "ABSENT")?._count._all ?? 0;
  return { members, visitors, activeMembers, events, upcomingEvents, ministries, present, absent };
}
