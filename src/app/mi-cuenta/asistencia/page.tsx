import type { Metadata } from "next";
import { CalendarCheck2, Flame, Trophy } from "lucide-react";
import { BarChart } from "@/components/bar-chart";
import { Badge, Card, EmptyState, StatCard } from "@/components/ui/layout";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, formatTime } from "@/lib/dates";
import { requirePortalActor } from "@/lib/session";
import { myAttendance } from "@/modules/portal/engagement";
import { getChurchTimezone } from "@/modules/settings/service";
import { ProgressRing } from "@/components/visuals";
import { PortalHeading, portalBlocker } from "../portal-ui";

export const metadata: Metadata = { title: "Mi asistencia" };

export default async function AttendancePage({ searchParams }: PageProps<"/mi-cuenta/asistencia">) {
  const actor = await requirePortalActor();
  const blocked = portalBlocker(actor);
  if (blocked) return blocked;
  const sp = await searchParams;
  const [a, tz] = await Promise.all([myAttendance(actor, Number(sp.page) || 1), getChurchTimezone()]);

  return (
    <div className="flex flex-col gap-6">
      <PortalHeading eyebrow="Constancia" title="Mi asistencia" description="Tu participación en las reuniones de los últimos 12 meses." />

      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex items-center gap-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <ProgressRing percent={a.rate12 ?? 0} size={110} label="Asistencia de los últimos 12 meses" />
          <div>
            <p className="font-semibold">Últimos 12 meses</p>
            <p className="text-sm text-muted">{a.recorded12 ? `${a.present12} de ${a.recorded12} reuniones` : "Aún sin registros"}</p>
          </div>
        </div>
        <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Racha actual" value={a.streak} detail="Reuniones seguidas con asistencia" icon={<Flame className="size-4" />} />
          <StatCard label="Mejor racha" value={a.best} detail="Tu récord personal" icon={<Trophy className="size-4" />} />
          <StatCard label="Registros totales" value={a.meta.total} detail="Desde que llevas registro" icon={<CalendarCheck2 className="size-4" />} />
        </div>
      </div>

      <Card title="Por mes" description="Asistencias (color principal) y ausencias registradas.">
        <BarChart label="Asistencia por mes" data={a.months} />
      </Card>

      <Card title="Historial">
        {a.history.length === 0 ? (
          <EmptyState title="Sin registros todavía" />
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border text-sm">
              {a.history.map((r) => (
                <li key={r.event.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="font-medium">{r.event.title}</span>
                    <span className="block text-xs text-muted">{r.event.type.name} · {formatDate(r.event.startsAt, tz)} · {formatTime(r.event.startsAt, tz)} h</span>
                  </span>
                  {r.status === "PRESENT" ? <Badge tone="success">Presente</Badge> : <Badge>Ausente</Badge>}
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Pagination page={a.meta.page} pageSize={a.meta.pageSize} total={a.meta.total} hrefFor={(p) => `/mi-cuenta/asistencia?page=${p}`} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
