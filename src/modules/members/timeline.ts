import { can, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";

export type TimelineItem = { date: Date; kind: string; title: string; detail?: string; href?: string };

export async function getMemberTimeline(actor: Actor, memberId: string): Promise<TimelineItem[]> {
  const [member, attendance, ministries, followUps, events, donations] = await Promise.all([
    db.member.findUnique({ where: { id: memberId }, select: { joinDate: true, firstName: true, lastName: true } }),
    can(actor, "attendance:read") ? db.attendance.findMany({ where: { memberId }, orderBy: { event: { startsAt: "desc" } }, take: 50, select: { status: true, event: { select: { id: true, title: true, startsAt: true } } } }) : Promise.resolve([]),
    can(actor, "ministries:read") ? db.ministryMembership.findMany({ where: { memberId }, orderBy: { startDate: "desc" }, take: 50, select: { startDate: true, endDate: true, role: true, ministry: { select: { id: true, name: true } } } }) : Promise.resolve([]),
    can(actor, "followup:read") ? db.followUp.findMany({ where: { memberId }, orderBy: { contactedOn: "desc" }, take: 50, select: { contactedOn: true, kind: true, notes: true } }) : Promise.resolve([]),
    can(actor, "events:read") ? db.event.findMany({ where: { responsibles: { some: { memberId } } }, orderBy: { startsAt: "desc" }, take: 50, select: { id: true, title: true, startsAt: true } }) : Promise.resolve([]),
    can(actor, "finance:read") ? db.donation.findMany({ where: { memberId, status: "VALID" }, orderBy: { receivedAt: "desc" }, take: 50, select: { receivedAt: true, amount: true, currency: true, concept: { select: { name: true } } } }) : Promise.resolve([]),
  ]);
  const items: TimelineItem[] = [];
  if (member?.joinDate) items.push({ date: member.joinDate, kind: "Ingreso", title: "Ingreso a la iglesia" });
  for (const r of attendance) items.push({ date: r.event.startsAt, kind: "Asistencia", title: r.event.title, detail: r.status === "PRESENT" ? "Presente" : "Ausente", href: `/admin/asistencia/${r.event.id}` });
  for (const m of ministries) items.push({ date: m.startDate, kind: "Ministerio", title: m.ministry.name, detail: m.role === "COORDINATOR" ? "Coordinador" : m.endDate ? "Participación finalizada" : "Integrante", href: `/admin/ministerios/${m.ministry.id}` });
  for (const f of followUps) items.push({ date: f.contactedOn, kind: "Seguimiento", title: "Contacto pastoral", detail: f.notes ?? f.kind });
  for (const e of events) items.push({ date: e.startsAt, kind: "Evento", title: e.title, href: `/admin/eventos/${e.id}` });
  for (const d of donations) items.push({ date: d.receivedAt, kind: "Aportación", title: d.concept.name, detail: `${d.amount.toString()} ${d.currency}` });
  return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 150);
}
