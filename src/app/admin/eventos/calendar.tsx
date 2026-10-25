import Link from "next/link";
import { formatTime, zonedParts } from "@/lib/dates";

type CalEvent = { id: string; title: string; startsAt: Date; status: string; visibility: string };

const HEAD = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function dayKey(d: Date, tz: string) {
  const p = zonedParts(d, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function EventChip({ e, tz }: { e: CalEvent; tz: string }) {
  const cancelled = e.status === "CANCELLED";
  return (
    <Link
      href={`/admin/eventos/${e.id}`}
      className={`block truncate rounded-md px-1.5 py-0.5 text-xs ${
        cancelled ? "bg-danger/10 text-danger line-through" : e.visibility === "PUBLIC" ? "bg-primary/12 text-primary" : "bg-accent-soft text-foreground"
      }`}
      title={`${formatTime(e.startsAt, tz)} ${e.title}${cancelled ? " (cancelado)" : ""}`}
    >
      <span className="tabular-nums">{formatTime(e.startsAt, tz)}</span> {e.title}
    </Link>
  );
}

/** Días (YYYY-MM-DD) desde `start` durante `count` días. */
function daysFrom(start: { year: number; month: number; day: number }, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(start.year, start.month - 1, start.day + i));
    return { key: d.toISOString().slice(0, 10), day: d.getUTCDate(), month: d.getUTCMonth() + 1 };
  });
}

export function MonthCalendar({ year, month, events, tz, todayKey }: { year: number; month: number; events: CalEvent[]; tz: string; todayKey: string }) {
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const days = daysFrom({ year, month, day: 1 - firstWeekday }, cells);
  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) {
    const k = dayKey(e.startsAt, tz);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="grid grid-cols-7 border-b border-border bg-surface-2 text-center text-xs font-medium uppercase tracking-wide text-muted">
        {HEAD.map((h) => <div key={h} className="py-2">{h}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const list = byDay.get(d.key) ?? [];
          const outside = d.month !== month;
          return (
            <div key={d.key} className={`min-h-20 border-b border-r border-border p-1 sm:min-h-28 ${outside ? "bg-surface-2/60 text-muted" : ""}`}>
              <div className={`mb-1 flex size-6 items-center justify-center rounded-full text-xs ${d.key === todayKey ? "bg-accent font-semibold text-white" : ""}`}>{d.day}</div>
              <div className="flex flex-col gap-1">
                {list.slice(0, 3).map((e) => <EventChip key={e.id} e={e} tz={tz} />)}
                {list.length > 3 ? <span className="px-1 text-xs text-muted">+{list.length - 3} más</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeekCalendar({ start, events, tz, todayKey }: { start: { year: number; month: number; day: number }; events: CalEvent[]; tz: string; todayKey: string }) {
  const days = daysFrom(start, 7);
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((d, i) => {
        const list = events.filter((e) => dayKey(e.startsAt, tz) === d.key);
        return (
          <div key={d.key} className={`rounded-2xl border bg-surface p-3 shadow-sm ${d.key === todayKey ? "border-accent" : "border-border"}`}>
            <p className="text-xs font-medium uppercase text-muted">{HEAD[i]}</p>
            <p className="font-display text-2xl font-semibold">{d.day}</p>
            <div className="mt-2 flex flex-col gap-1">
              {list.length ? list.map((e) => <EventChip key={e.id} e={e} tz={tz} />) : <span className="text-xs text-muted">—</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
