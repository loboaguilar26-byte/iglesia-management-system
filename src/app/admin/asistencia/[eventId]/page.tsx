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
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field } from "@/components/ui/field";
import { quickVisitorAction, saveAttendanceAction } from "../actions";
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
      {can(actor, "members:create") && can(actor, "attendance:record") && !cancelled && !tooEarly ? (
        <details className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <summary className="cursor-pointer font-medium text-primary">+ Registrar visitante nuevo</summary>
          <p className="mt-2 text-sm text-muted">Crea su ficha como “Visitante”, lo marca presente y queda en Seguimiento para contactarlo.</p>
          <ActionForm action={quickVisitorAction.bind(null, event.id)} className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Nombre(s)" name="firstName" required autoComplete="off" />
            <Field label="Apellidos" name="lastName" required autoComplete="off" />
            <Field label="Teléfono (opcional)" name="phone" type="tel" />
            <div className="flex flex-wrap items-center gap-4 sm:col-span-3">
              <CheckboxField label="Registrar aunque parezca duplicado" name="confirmDuplicate" />
              <SubmitButton>Registrar y marcar presente</SubmitButton>
            </div>
          </ActionForm>
        </details>
      ) : null}
      {/* La clave reinicia las marcas cuando cambian los registros (p. ej. tras agregar un visitante). */}
      <AttendanceSheet key={`${sheet.rows.length}-${sheet.summary.present}-${sheet.summary.absent}`} rows={sheet.rows} visitorCount={event.visitorCount} action={saveAttendanceAction.bind(null, event.id)} canRecord={can(actor, "attendance:record") && !cancelled && !tooEarly} />
    </div>
  );
}
