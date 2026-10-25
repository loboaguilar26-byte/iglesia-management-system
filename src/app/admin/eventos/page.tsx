import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader, ResponsiveTable } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { MONTHS, formatDateTime, zonedParts, zonedToUtc } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { EVENT_STATUS_LABEL } from "@/modules/events/schema";
import { listEventsInRange, listUpcomingEvents } from "@/modules/events/service";
import { getChurchTimezone } from "@/modules/settings/service";
import { MonthCalendar, WeekCalendar } from "./calendar";

export const metadata: Metadata = { title: "Eventos" };

const pad = (n: number) => String(n).padStart(2, "0");

export default async function EventsPage({ searchParams }: PageProps<"/admin/eventos">) {
  const actor = await requirePageActor();
  if (!can(actor, "events:read")) notFound();
  const sp = await searchParams;
  const tz = await getChurchTimezone();
  const now = zonedParts(new Date(), tz);
  const todayKey = `${now.year}-${pad(now.month)}-${pad(now.day)}`;
  const view = sp.vista === "semana" ? "semana" : sp.vista === "lista" ? "lista" : "mes";

  const tabs = (
    <nav aria-label="Vista" className="inline-flex rounded-lg border border-border bg-surface p-1 text-sm">
      {(["mes", "semana", "lista"] as const).map((v) => (
        <Link key={v} href={`/admin/eventos?vista=${v}`} aria-current={view === v ? "page" : undefined} className={`rounded-md px-3 py-1.5 capitalize ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-surface-2"}`}>
          {v}
        </Link>
      ))}
    </nav>
  );
  const header = (
    <PageHeader
      title="Eventos y calendario"
      description="Cultos, reuniones, ensayos y actividades. Los eventos públicos aparecen en el sitio web."
      actions={can(actor, "events:create") ? <Link href="/admin/eventos/nuevo" className={buttonClass()}>Nuevo evento</Link> : null}
    />
  );

  if (view === "lista") {
    const events = await listUpcomingEvents(actor);
    return (
      <div className="flex flex-col gap-6">
        {header}
        {tabs}
        {events.length === 0 ? (
          <EmptyState title="No hay eventos próximos" />
        ) : (
          <ResponsiveTable
            rows={events}
            rowKey={(e) => e.id}
            columns={[
              { header: "Evento", cell: (e) => <Link className="font-medium text-primary hover:underline" href={`/admin/eventos/${e.id}`}>{e.title}</Link> },
              { header: "Fecha", cell: (e) => formatDateTime(e.startsAt, tz) },
              { header: "Tipo", cell: (e) => e.type.name },
              { header: "Lugar", cell: (e) => e.location ?? "—" },
              { header: "Estado", cell: (e) => <span className="flex gap-1"><Badge tone={e.status === "CANCELLED" ? "danger" : "info"}>{EVENT_STATUS_LABEL[e.status]}</Badge>{e.visibility === "PUBLIC" ? <Badge tone="success">Público</Badge> : null}</span> },
            ]}
          />
        )}
      </div>
    );
  }

  if (view === "semana") {
    const base = typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? new Date(`${sp.fecha}T12:00:00Z`) : new Date(Date.UTC(now.year, now.month - 1, now.day, 12));
    const monday = new Date(base.getTime() - ((base.getUTCDay() + 6) % 7) * 86400000);
    const start = { year: monday.getUTCFullYear(), month: monday.getUTCMonth() + 1, day: monday.getUTCDate() };
    const from = zonedToUtc(start, tz);
    const to = zonedToUtc({ ...start, day: start.day + 7 }, tz);
    const events = await listEventsInRange(actor, from, to);
    const shift = (days: number) => new Date(monday.getTime() + days * 86400000).toISOString().slice(0, 10);
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {tabs}
          <div className="flex items-center gap-2">
            <Link className={buttonClass("secondary", "", "sm")} href={`/admin/eventos?vista=semana&fecha=${shift(-7)}`}>← Anterior</Link>
            <span className="text-sm font-medium">Semana del {start.day} de {MONTHS[start.month - 1]}</span>
            <Link className={buttonClass("secondary", "", "sm")} href={`/admin/eventos?vista=semana&fecha=${shift(7)}`}>Siguiente →</Link>
          </div>
        </div>
        <WeekCalendar start={start} events={events} tz={tz} todayKey={todayKey} />
      </div>
    );
  }

  const m = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : `${now.year}-${pad(now.month)}`;
  const [year, month] = m.split("-").map(Number);
  const from = zonedToUtc({ year, month, day: 1 }, tz);
  const to = zonedToUtc(month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 }, tz);
  const events = await listEventsInRange(actor, from, to);
  const prev = month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {tabs}
        <div className="flex items-center gap-2">
          <Link className={buttonClass("secondary", "", "sm")} href={`/admin/eventos?mes=${prev}`} aria-label="Mes anterior">←</Link>
          <h2 className="min-w-40 text-center font-display text-xl font-semibold capitalize">{MONTHS[month - 1]} {year}</h2>
          <Link className={buttonClass("secondary", "", "sm")} href={`/admin/eventos?mes=${next}`} aria-label="Mes siguiente">→</Link>
        </div>
      </div>
      <MonthCalendar year={year} month={month} events={events} tz={tz} todayKey={todayKey} />
      <p className="text-xs text-muted">
        <span className="mr-3 inline-block rounded bg-primary/12 px-1.5 text-primary">Público</span>
        <span className="mr-3 inline-block rounded bg-accent-soft px-1.5">Interno</span>
        <span className="inline-block rounded bg-danger/10 px-1.5 text-danger line-through">Cancelado</span>
      </p>
    </div>
  );
}
