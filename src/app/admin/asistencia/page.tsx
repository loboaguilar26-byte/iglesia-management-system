import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, PageHeader, ResponsiveTable } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { MONTHS, formatDateTime, zonedParts, zonedToUtc } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { listAttendanceEvents } from "@/modules/attendance/service";
import { getChurchTimezone } from "@/modules/settings/service";

export const metadata: Metadata = { title: "Asistencia" };
const pad = (n: number) => String(n).padStart(2, "0");

export default async function AttendancePage({ searchParams }: PageProps<"/admin/asistencia">) {
  const actor = await requirePageActor();
  if (!can(actor, "attendance:read")) notFound();
  const sp = await searchParams;
  const tz = await getChurchTimezone();
  const now = zonedParts(new Date(), tz);
  const m = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : `${now.year}-${pad(now.month)}`;
  const [year, month] = m.split("-").map(Number);
  const from = zonedToUtc({ year, month, day: 1 }, tz);
  const to = zonedToUtc(month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 }, tz);
  const events = await listAttendanceEvents(actor, { from, to });
  const prev = month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
  const totals = events.reduce((t, e) => ({ present: t.present + e.present, visitors: t.visitors + e.visitorCount }), { present: 0, visitors: 0 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Asistencia" description="Selecciona un evento para pasar lista. Los reportes semanales y mensuales están en Reportes." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link className={buttonClass("secondary", "", "sm")} href={`/admin/asistencia?mes=${prev}`} aria-label="Mes anterior">←</Link>
          <h2 className="min-w-40 text-center font-display text-xl font-semibold capitalize">{MONTHS[month - 1]} {year}</h2>
          <Link className={buttonClass("secondary", "", "sm")} href={`/admin/asistencia?mes=${next}`} aria-label="Mes siguiente">→</Link>
        </div>
        <p className="text-sm text-muted">Total del mes: <strong className="text-foreground">{totals.present}</strong> asistencias registradas + <strong className="text-foreground">{totals.visitors}</strong> visitantes sin ficha</p>
      </div>
      {events.length === 0 ? (
        <EmptyState title="Sin eventos este mes" description="Crea eventos en el calendario para registrar su asistencia." />
      ) : (
        <ResponsiveTable
          rows={events}
          rowKey={(e) => e.id}
          columns={[
            { header: "Evento", cell: (e) => <Link className="font-medium text-primary hover:underline" href={`/admin/asistencia/${e.id}`}>{e.title}</Link> },
            { header: "Fecha", cell: (e) => formatDateTime(e.startsAt, tz) },
            { header: "Tipo", cell: (e) => `${e.type.name}${e.ministry ? ` · ${e.ministry.name}` : ""}` },
            { header: "Presentes", cell: (e) => <span className="tabular-nums text-success">{e.present}</span>, className: "text-right" },
            { header: "Ausentes", cell: (e) => <span className="tabular-nums text-danger">{e.absent}</span>, className: "text-right" },
            { header: "Visitantes", cell: (e) => <span className="tabular-nums">{e.visitorCount}</span>, className: "text-right" },
          ]}
        />
      )}
    </div>
  );
}
