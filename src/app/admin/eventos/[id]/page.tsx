import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { ActionButton } from "@/components/ui/action-button";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { Badge, Card, PageHeader } from "@/components/ui/layout";
import { can, canFully } from "@/lib/authz";
import { formatDateTime, formatLongDate, formatTime, toLocalInput } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { requirePageActor } from "@/lib/session";
import { EVENT_STATUS_LABEL, VISIBILITY_LABEL } from "@/modules/events/schema";
import { getEvent, listEventTypes, ministryOptionsFor } from "@/modules/events/service";
import { eventRsvpSummary } from "@/modules/portal/engagement";
import { getChurchTimezone } from "@/modules/settings/service";
import { cancelEventAction, sendEventReminderAction, updateEventAction } from "../actions";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "Evento" };

export default async function EventPage({ params, searchParams }: PageProps<"/admin/eventos/[id]">) {
  const actor = await requirePageActor();
  const { id } = await params;
  const saved = (await searchParams).guardado === "1";
  const e = await getEvent(actor, id).catch((err) => {
    if (err instanceof AppError && (err.code === "NOT_FOUND" || err.code === "FORBIDDEN")) notFound();
    throw err;
  });
  const [tz, types, ministries, rsvp] = await Promise.all([getChurchTimezone(), listEventTypes(), ministryOptionsFor(actor), eventRsvpSummary(actor, e.id)]);
  const cancelled = e.status === "CANCELLED";
  const canEdit = can(actor, "events:update") && !cancelled;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title={e.title}
        back={{ href: "/admin/eventos", label: "Eventos" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={cancelled ? "danger" : "info"}>{EVENT_STATUS_LABEL[e.status]}</Badge>
            <Badge tone={e.visibility === "PUBLIC" ? "success" : "neutral"}>{VISIBILITY_LABEL[e.visibility]}</Badge>
            <span>{formatLongDate(e.startsAt, tz)} · {formatTime(e.startsAt, tz)}–{formatTime(e.endsAt, tz)}</span>
          </span>
        }
        actions={
          <>
            {can(actor, "attendance:read") && !cancelled ? <Link href={`/admin/asistencia/${e.id}`} className={buttonClass("accent")}>Asistencia ({e._count.attendances})</Link> : null}
            {can(actor, "events:create") ? <Link href={`/admin/eventos/nuevo?copiar=${e.id}`} className={buttonClass("secondary")}>Duplicar</Link> : null}
            {can(actor, "events:update") && !cancelled ? <ActionButton action={sendEventReminderAction.bind(null, e.id)} variant="secondary">Enviar recordatorio</ActionButton> : null}
          </>
        }
      />
      {saved ? <Alert tone="success">Evento guardado.</Alert> : null}
      {cancelled ? <Alert tone="error">Evento cancelado. Motivo: {e.cancelledReason}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card title={canEdit ? "Editar evento" : "Detalles"}>
          {canEdit ? (
            <EventForm
              action={updateEventAction.bind(null, e.id)}
              values={{
                title: e.title,
                typeId: e.typeId,
                startsAt: toLocalInput(e.startsAt, tz),
                endsAt: toLocalInput(e.endsAt, tz),
                location: e.location,
                description: e.description,
                visibility: e.visibility,
                ministryId: e.ministryId,
                chapelId: e.chapelId,
                responsibles: e.responsibles.map((r) => ({ id: r.member.id, name: `${r.member.firstName} ${r.member.lastName}` })),
              }}
              types={types}
              ministries={e.ministry && !ministries.some((m) => m.id === e.ministry!.id) ? [...ministries, e.ministry] : ministries}
              requireMinistry={!canFully(actor, "events:update")}
              submitLabel="Guardar cambios"
            />
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Tipo</dt><dd>{e.type.name}</dd>
              <dt className="text-muted">Inicio</dt><dd>{formatDateTime(e.startsAt, tz)}</dd>
              <dt className="text-muted">Fin</dt><dd>{formatDateTime(e.endsAt, tz)}</dd>
              <dt className="text-muted">Lugar</dt><dd>{e.location ?? "—"}</dd>
              <dt className="text-muted">Ministerio</dt><dd>{e.ministry?.name ?? "General"}</dd>
              <dt className="text-muted">Responsables</dt><dd>{e.responsibles.map((r) => `${r.member.firstName} ${r.member.lastName}`).join(", ") || "—"}</dd>
              <dt className="text-muted">Descripción</dt><dd className="whitespace-pre-line">{e.description ?? "—"}</dd>
            </dl>
          )}
        </Card>
        <Card title="Confirmaciones del portal" description="Respuestas de los miembros desde su portal (no sustituye la asistencia).">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Asistirán", value: rsvp.going, tone: "text-success" },
              { label: "Tal vez", value: rsvp.maybe, tone: "text-accent" },
              { label: "No podrán", value: rsvp.notGoing, tone: "text-muted" },
            ].map((x) => (
              <div key={x.label} className="rounded-xl bg-surface-2 p-3">
                <p className={`font-display text-2xl font-semibold tabular-nums ${x.tone}`}>{x.value}</p>
                <p className="text-xs text-muted">{x.label}</p>
              </div>
            ))}
          </div>
          {rsvp.people.length ? (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {rsvp.people.map((p) => (
                <li key={p.id}><Link href={`/admin/miembros/${p.id}`} className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs hover:border-primary hover:text-primary">{p.firstName} {p.lastName}</Link></li>
              ))}
            </ul>
          ) : null}
        </Card>
        {can(actor, "events:cancel") && !cancelled ? (
          <Card title="Cancelar evento" description="El evento se conserva y se muestra como cancelado.">
            <ActionForm action={cancelEventAction.bind(null, e.id)} confirmMessage="¿Cancelar este evento?">
              <TextArea label="Motivo" name="reason" rows={3} required />
              <SubmitButton variant="danger">Cancelar evento</SubmitButton>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
