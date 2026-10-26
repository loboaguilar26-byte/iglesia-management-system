import { Decimal } from "decimal.js";
import { can, canFully, requireActor, type Actor } from "@/lib/authz";
import { parseDateOnly, toDateInput, weekStartKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { eventScopeWhere } from "../scope";
import { donationSummary, expenseSummary, monthlyTotals } from "../finance/service";

const DAY = 86400000;

/**
 * Indicadores del panel. Cada bloque se calcula solo si el actor tiene el permiso correspondiente;
 * los bloques no autorizados no existen en la respuesta (no se envían vacíos).
 */
export async function getDashboard(actor: Actor | null, tz: string, now = new Date()) {
  const a = requireActor(actor);
  const result: {
    members?: { active: number; visitors: number };
    birthdays?: { id: string; name: string; day: number; isToday: boolean }[];
    ministries?: { active: number };
    upcoming?: { count: number; list: { id: string; title: string; startsAt: Date; location: string | null; visibility: string }[] };
    attendance?: { last30: number; visitors30: number; weekly: { week: string; present: number; visitors: number }[] };
    financeSummary?: { todayTotal: string; todayCount: number; weekTotal: string; weekCount: number };
    finance?: { monthTotal: string; monthCount: number; expenseTotal: string; balance: string; monthly: { year: number; month: number; total: string }[] };
  } = {};

  if (can(a, "members:read")) {
    const [active, visitors] = await Promise.all([db.member.count({ where: { status: "ACTIVE" } }), db.member.count({ where: { status: "VISITOR" } })]);
    result.members = { active, visitors };
  }
  // Cumpleaños del mes (zona de la iglesia), solo con acceso completo al directorio; no inactivos.
  if (canFully(a, "members:read")) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, month: "numeric", day: "numeric" }).formatToParts(now);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const today = Number(parts.find((p) => p.type === "day")?.value);
    const rows = await db.$queryRaw<{ id: string; firstName: string; lastName: string; day: number }[]>`
      SELECT id, "firstName", "lastName", EXTRACT(DAY FROM "birthDate")::int AS day
      FROM member
      WHERE "birthDate" IS NOT NULL AND status <> 'INACTIVE' AND EXTRACT(MONTH FROM "birthDate") = ${month}
      ORDER BY day, "lastName" LIMIT 30`;
    result.birthdays = rows.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}`, day: r.day, isToday: r.day === today }));
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
  if (can(a, "finance:dashboard")) {
    const today = toDateInput(now, tz);
    const weekStart = weekStartKey(now, tz);
    const [todaySummary, weekSummary] = await Promise.all([
      db.donation.aggregate({
        where: { status: "VALID", receivedAt: parseDateOnly(today) },
        _sum: { amount: true },
        _count: true,
      }),
      db.donation.aggregate({
        where: { status: "VALID", receivedAt: { gte: parseDateOnly(weekStart), lte: parseDateOnly(today) } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);
    result.financeSummary = {
      todayTotal: new Decimal(todaySummary._sum.amount?.toString() ?? 0).toFixed(2),
      todayCount: todaySummary._count,
      weekTotal: new Decimal(weekSummary._sum.amount?.toString() ?? 0).toFixed(2),
      weekCount: weekSummary._count,
    };
  }
  if (can(a, "finance:read")) {
    const p = toDateInput(now, tz);
    const from = `${p.slice(0, 7)}-01`;
    const [summary, expenses, monthly] = await Promise.all([
      donationSummary(a, { from, to: p }),
      expenseSummary(a, { from, to: p }),
      monthlyTotals(a, 6, now),
    ]);
    result.finance = {
      monthTotal: summary.total,
      monthCount: summary.count,
      expenseTotal: expenses.total,
      balance: new Decimal(summary.total).minus(expenses.total).toFixed(2),
      monthly,
    };
  }
  return result;
}
