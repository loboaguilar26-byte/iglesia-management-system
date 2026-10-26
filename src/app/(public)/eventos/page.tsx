import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { MONTHS, formatTime, zonedParts, zonedToUtc } from "@/lib/dates";
import { getPublicEvents, getPublicEventsInRange, getPublicSite } from "@/modules/public/service";
import { Empty, EventCard, PageHero, Section, type PublicEvent } from "../components";

export const metadata: Metadata = { title: "Eventos" };

const pad = (n: number) => String(n).padStart(2, "0");
const HEAD = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default async function PublicEventsPage({ searchParams }: PageProps<"/eventos">) {
  const [{ settings }, events] = await Promise.all([getPublicSite(), getPublicEvents(50)]);
  return (
    <>
      <PageHero title="Eventos" intro="Actividades abiertas a toda la comunidad." />
      <Section title="Próximamente">
        {events.length ? (
          <div className="grid gap-4 md:grid-cols-2">{events.map((e) => <EventCard key={e.id} e={e} tz={settings.timezone} />)}</div>
        ) : (
          <Empty>No hay eventos públicos programados por ahora.</Empty>
        )}
      </Section>
      <Section title="Calendario" tone="tinted">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface-2" />}>
          <PublicCalendar searchParams={searchParams} tz={settings.timezone} />
        </Suspense>
      </Section>
    </>
  );
}

async function PublicCalendar({ searchParams, tz }: { searchParams: PageProps<"/eventos">["searchParams"]; tz: string }) {
  const sp = await searchParams;
  await connection();
  const now = zonedParts(new Date(), tz);
  const m = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : `${now.year}-${pad(now.month)}`;
  const [year, month] = m.split("-").map(Number);
  const from = zonedToUtc({ year, month, day: 1 }, tz);
  const to = zonedToUtc(month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 }, tz);
  const events = await getPublicEventsInRange(from.toISOString(), to.toISOString());
  const prev = month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
  const todayKey = `${now.year}-${pad(now.month)}-${pad(now.day)}`;

  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const byDay = new Map<string, PublicEvent[]>();
  for (const e of events) {
    const p = zonedParts(e.startsAt, tz);
    const k = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/eventos?mes=${prev}#calendario`} scroll={false} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-2" aria-label="Mes anterior">←</Link>
        <h3 id="calendario" className="font-display text-2xl font-semibold capitalize">{MONTHS[month - 1]} {year}</h3>
        <Link href={`/eventos?mes=${next}#calendario`} scroll={false} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-2" aria-label="Mes siguiente">→</Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="grid grid-cols-7 bg-surface-2 text-center text-xs font-semibold uppercase tracking-wider text-muted">
          {HEAD.map((h) => <div key={h} className="py-2">{h}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: cells }, (_, i) => {
            const d = new Date(Date.UTC(year, month - 1, 1 - firstWeekday + i));
            const key = d.toISOString().slice(0, 10);
            const list = byDay.get(key) ?? [];
            const outside = d.getUTCMonth() + 1 !== month;
            return (
              <div key={key} className={`min-h-16 border-r border-t border-border p-1 sm:min-h-24 ${outside ? "bg-surface-2/50 text-muted" : ""}`}>
                <span className={`flex size-6 items-center justify-center rounded-full text-xs ${key === todayKey ? "bg-accent font-semibold text-white" : ""}`}>{d.getUTCDate()}</span>
                <div className="mt-1 flex flex-col gap-1">
                  {list.map((e) => (
                    <Link key={e.id} href={`/eventos/${e.id}`} className={`block truncate rounded px-1 py-0.5 text-[11px] ${e.status === "CANCELLED" ? "bg-danger/10 text-danger line-through" : "bg-brand text-white"}`} title={e.title}>
                      <span className="hidden sm:inline">{formatTime(e.startsAt, tz)} </span>{e.title}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
