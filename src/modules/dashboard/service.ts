import { can, requireActor, type Actor } from "@/lib/authz";
import { weekStartKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { eventScopeWhere } from "../scope";
import { donationSummary, monthlyTotals } from "../finance/service";

const DAY = 86400000;

/**
 * Indicadores del panel. Cada bloque se calcula solo si el actor tiene el permiso correspondiente;
 * los bloques no autorizados no existen en la respuesta (no se envían vacíos).
 */
export async function getDashboard(actor: Actor | null, tz: string, now = new Date()) {
  const a = requireActor(actor);
  const result: {
    members?: { active: number; visitors: number };
    ministries?: { active: number };
    upcoming?: { count: number; list: { id: string; title: string; startsAt: Date; location: string | null; visibility: string }[] };
    attendance?: { last30: number; visitors30: number; weekly: { week: string; present: number; visitors: number }[] };
    finance?: { monthTotal: string; monthCount: number; monthly: { year: number; month: number; total: string }[] };
  } = {};

  if (can(a, "members:read")) {
    const [active, visitors] = await Promise.all([db.member.count({ where: { status: "ACTIVE" } }), db.member.count({ where: { status: "VISITOR" } })]);
    result.members = { active, visitors };
  }
  if (can(a, "ministries:read")) {
    result.ministries = { active: await db.ministry.count({ where: { isActive: true } }) };
  }
  if (can(a, "events:read")) {
    const scope = await eventScopeWhere(a, "events:read");
    const where = { AND: [scope ?? {}, { status: "SCHEDULED" as const, startsAt: { gte: now, lt: new Date(now.getTime() + 7 * DAY) } }] };
    const [count, list] = await Promise.all([
      db.event.count({ where }),
      db.event.findMany({ where: { AND: [scope ?? {}, { status: "SCHEDULED", endsAt: { gte: now } }] }, orderBy: { startsAt: "asc" }, take: 5, select: { id: true, title: true, startsAt: true, location: true, visibility: true } }),
    ]);
    result.upcoming = { count, list };
  }
  if (can(a, "attendance:read")) {
    const scope = await eventScopeWhere(a, "attendance:read");
    const since = new Date(now.getTime() - 12 * 7 * DAY);
    const events = await db.event.findMany({
      where: { AND: [scope ?? {}, { status: { not: "CANCELLED" }, startsAt: { gte: since, lte: now } }] },
      select: { startsAt: true, visitorCount: true, _count: { select: { attendances: { where: { status: "PRESENT" } } } } },
    });
    const weeks = new Map<string, { present: number; visitors: number }>();
    for (let i = 11; i >= 0; i--) weeks.set(weekStartKey(new Date(now.getTime() - i * 7 * DAY), tz), { present: 0, visitors: 0 });
    let last30 = 0;
    let visitors30 = 0;
    for (const e of events) {
      const w = weeks.get(weekStartKey(e.startsAt, tz));
      if (w) {
        w.present += e._count.attendances;
        w.visitors += e.visitorCount;
      }
      if (e.startsAt.getTime() >= now.getTime() - 30 * DAY) {
        last30 += e._count.attendances;
        visitors30 += e.visitorCount;
      }
    }
    result.attendance = { last30, visitors30, weekly: [...weeks].map(([week, v]) => ({ week, ...v })) };
  }
  if (can(a, "finance:read")) {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const from = `${p.slice(0, 7)}-01`;
    const [summary, monthly] = await Promise.all([donationSummary(a, { from, to: p }), monthlyTotals(a, 6, now)]);
    result.finance = { monthTotal: summary.total, monthCount: summary.count, monthly };
  }
  return result;
}
