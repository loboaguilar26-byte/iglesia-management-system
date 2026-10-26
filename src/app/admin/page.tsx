import { CalendarDays, ClipboardCheck, HandHeart, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { BarChart } from "@/components/bar-chart";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, EmptyState, StatCard } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { MONTHS, formatDateOnly, formatLongDate, formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requirePageActor } from "@/lib/session";
import { currentAnnouncements } from "@/modules/announcements/service";
import { getDashboard } from "@/modules/dashboard/service";
import { getChurchTimezone, getSettingsInternal } from "@/modules/settings/service";

export default async function AdminHomePage() {
  const actor = await requirePageActor();
  const [tz, settings] = await Promise.all([getChurchTimezone(), getSettingsInternal()]);
  const [d, announcements] = await Promise.all([
    getDashboard(actor, tz),
    can(actor, "announcements:read") ? currentAnnouncements(actor, 4) : Promise.resolve(null),
  ]);
  const quick = [
    can(actor, "members:create") && { href: "/admin/miembros/nuevo", label: "Registrar persona" },
    can(actor, "events:create") && { href: "/admin/eventos/nuevo", label: "Nuevo evento" },
    can(actor, "attendance:record") && { href: "/admin/asistencia", label: "Pasar lista" },
    can(actor, "finance:create") && { href: "/admin/tesoreria", label: "Registrar aportación" },
    can(actor, "announcements:create") && { href: "/admin/comunicados/nuevo", label: "Nuevo comunicado" },
  ].filter(Boolean) as { href: string; label: string }[];
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-deep p-6 text-white shadow-lg sm:p-8">
        <div aria-hidden className="absolute -right-16 -top-16 size-64 rounded-full bg-accent/25 blur-3xl" />
        <p className="text-sm opacity-80">{formatLongDate(new Date(), tz)}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">{greeting}, {actor.name.split(" ")[0]}</h1>
        <p className="mt-1 opacity-85">{settings.name}</p>
        {quick.length ? (
          <div className="relative mt-6 flex flex-wrap gap-2">
            {quick.map((q) => <Link key={q.href} href={q.href} className="rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25">{q.label}</Link>)}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 grid-cols-2 sm:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        {d.members ? <StatCard label="Miembros activos" value={d.members.active} detail={`Estado “Activo” al día de hoy · ${d.members.visitors} visitantes registrados`} icon={<Users className="size-4" />} /> : null}
        {d.upcoming ? <StatCard label="Eventos próximos" value={d.upcoming.count} detail="Programados en los próximos 7 días" icon={<CalendarDays className="size-4" />} /> : null}
        {d.attendance ? <StatCard label="Asistencias registradas" value={d.attendance.last30} detail={`Marcas “presente” en los últimos 30 días · +${d.attendance.visitors30} visitantes sin ficha`} icon={<ClipboardCheck className="size-4" />} /> : null}
        {d.ministries ? <StatCard label="Ministerios activos" value={d.ministries.active} detail="Ministerios con estado activo" icon={<HandHeart className="size-4" />} /> : null}
        {d.financeSummary ? <StatCard label="Ingresos de hoy" value={formatMoney(d.financeSummary.todayTotal, settings.currency)} detail={`${d.financeSummary.todayCount} aportaciones aprobadas`} icon={<Wallet className="size-4" />} /> : null}
        {d.financeSummary ? <StatCard label="Ingresos de la semana" value={formatMoney(d.financeSummary.weekTotal, settings.currency)} detail={`${d.financeSummary.weekCount} aportaciones aprobadas desde el lunes`} icon={<CalendarDays className="size-4" />} /> : null}
        {d.finance ? <StatCard label="Balance neto del mes" value={formatMoney(d.finance.balance, settings.currency)} detail={`${formatMoney(d.finance.monthTotal, settings.currency)} ingresos · ${formatMoney(d.finance.expenseTotal, settings.currency)} gastos`} icon={<Wallet className="size-4" />} /> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {d.attendance ? (
          <Card title="Asistencia semanal" description="Presentes registrados (azul) y visitantes sin ficha (dorado) por semana, últimas 12 semanas.">
            <BarChart
              label="Asistencia semanal"
              data={d.attendance.weekly.map((w) => ({ label: formatDateOnly(new Date(`${w.week}T00:00:00Z`)).slice(0, 5), value: w.present, stack: w.visitors }))}
            />
          </Card>
        ) : null}
        {d.finance ? (
          <Card title="Ingresos mensuales" description="Aportaciones vigentes por mes, últimos 6 meses.">
            <BarChart
              label="Ingresos mensuales"
              color="var(--accent)"
              format={(v) => formatMoney(v, settings.currency)}
              data={d.finance.monthly.map((m) => ({ label: `${MONTHS[m.month - 1].slice(0, 3)} ${String(m.year).slice(2)}`, value: Number(m.total) }))}
            />
          </Card>
        ) : null}
        {d.upcoming ? (
          <Card title="Próximos eventos" actions={<Link href="/admin/eventos" className="text-sm text-primary hover:underline">Calendario</Link>}>
            {d.upcoming.list.length === 0 ? (
              <EmptyState title="No hay eventos programados" action={can(actor, "events:create") ? <Link href="/admin/eventos/nuevo" className={buttonClass("secondary", "", "sm")}>Crear evento</Link> : undefined} />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {d.upcoming.list.map((e) => (
                  <li key={e.id} className="flex items-center gap-4 py-3">
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-accent-soft py-1.5 text-accent">
                      <span className="text-[10px] font-semibold uppercase">{new Intl.DateTimeFormat("es-MX", { timeZone: tz, month: "short" }).format(e.startsAt)}</span>
                      <span className="font-display text-xl font-semibold leading-none">{new Intl.DateTimeFormat("es-MX", { timeZone: tz, day: "numeric" }).format(e.startsAt)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/eventos/${e.id}`} className="block truncate font-medium hover:underline">{e.title}</Link>
                      <p className="truncate text-sm text-muted">{formatTime(e.startsAt, tz)}{e.location ? ` · ${e.location}` : ""}</p>
                    </div>
                    {e.visibility === "PUBLIC" ? <Badge tone="success">Público</Badge> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
        {d.birthdays ? (
          <Card title="Cumpleaños del mes" description="Personas con fecha de nacimiento registrada (no inactivas).">
            {d.birthdays.length === 0 ? (
              <EmptyState title="Sin cumpleaños registrados este mes" description="Agrega la fecha de nacimiento (opcional) en la ficha de cada persona." />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {d.birthdays.map((b) => (
                  <li key={b.id}>
                    <Link href={`/admin/miembros/${b.id}`} className={`flex items-center gap-3 rounded-xl border p-3 transition hover:bg-surface-2 ${b.isToday ? "border-accent bg-accent-soft/50" : "border-border"}`}>
                      <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-brand text-white">
                        <span className="font-display text-lg font-semibold leading-none">{b.day}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{b.name}</span>
                        {b.isToday ? <span className="text-xs font-semibold text-accent">¡Hoy!</span> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
        {announcements ? (
          <Card title="Comunicados vigentes" actions={<Link href="/admin/comunicados" className="text-sm text-primary hover:underline">Ver todos</Link>}>
            {announcements.length === 0 ? (
              <EmptyState title="Sin comunicados publicados" />
            ) : (
              <ul className="flex flex-col gap-3">
                {announcements.map((a) => (
                  <li key={a.id} className={`rounded-xl border p-3 ${a.isFeatured ? "border-accent bg-accent-soft/50" : "border-border"}`}>
                    <Link href={`/admin/comunicados/${a.id}`} className="font-medium hover:underline">{a.title}</Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
