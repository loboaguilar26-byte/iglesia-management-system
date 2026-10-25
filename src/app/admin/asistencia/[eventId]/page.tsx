import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { formatLongDate, formatTime } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { requirePageActor } from "@/lib/session";
import { getAttendanceSheet } from "@/modules/attendance/service";
import { getChurchTimezone } from "@/modules/settings/service";
import { saveAttendanceAction } from "../actions";
import { AttendanceSheet } from "./attendance-sheet";

export const metadata: Metadata = { title: "Pase de lista" };

export default async function AttendanceSheetPage({ params }: PageProps<"/admin/asistencia/[eventId]">) {
  const actor = await requirePageActor();
  const { eventId } = await params;
  const [sheet, tz] = await Promise.all([
    getAttendanceSheet(actor, eventId).catch((e) => {
      if (e instanceof AppError && (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")) notFound();
      throw e;
    }),
    getChurchTimezone(),
  ]);
  const { event } = sheet;
  const cancelled = event.status === "CANCELLED";
  const { tooEarly } = sheet;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title={`Asistencia: ${event.title}`}
        back={{ href: "/admin/asistencia", label: "Asistencia" }}
        description={<span>{formatLongDate(event.startsAt, tz)} · {formatTime(event.startsAt, tz)}{event.ministry ? ` · ${event.ministry.name}` : ""}</span>}
      />
      <Alert tone="info">
        Una persona sin marca queda <strong>pendiente</strong>: no se cuenta como ausente hasta que se registre. {event.ministry ? "Se listan los integrantes vigentes del ministerio." : "Se listan miembros activos y visitantes registrados."}
      </Alert>
      {cancelled ? <Alert tone="error">El evento está cancelado; no se registra asistencia.</Alert> : null}
      {tooEarly ? <Alert tone="error">El evento aún no ocurre; podrás registrar asistencia a partir de 24 horas antes.</Alert> : null}
      <AttendanceSheet rows={sheet.rows} visitorCount={event.visitorCount} action={saveAttendanceAction.bind(null, event.id)} canRecord={can(actor, "attendance:record") && !cancelled && !tooEarly} />
    </div>
  );
}
