import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { Alert } from "@/components/ui/alert";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { formatDate, formatDateOnly, formatDateTime, toDateInput } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { requirePageActor } from "@/lib/session";
import { MEMBER_STATUS_LABEL } from "@/modules/members/schema";
import { getMember } from "@/modules/members/service";
import { getChurchTimezone } from "@/modules/settings/service";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";
import { memberFollowUps, FOLLOWUP_KIND_LABEL } from "@/modules/followups/service";
import { FollowUpForm } from "../../seguimiento/followup-form";
import { createPortalAccountAction, setMemberStatusAction, updateMemberAction } from "../actions";
import { MemberForm } from "../member-form";
import { statusTone } from "../status-tone";
import { getMemberTimeline } from "@/modules/members/timeline";

export const metadata: Metadata = { title: "Ficha de miembro" };

export default async function MemberPage({ params, searchParams }: PageProps<"/admin/miembros/[id]">) {
  const actor = await requirePageActor();
  if (!can(actor, "members:read")) notFound();
  const { id } = await params;
  const saved = (await searchParams).guardado === "1";
  const [m, tz] = await Promise.all([
    getMember(actor, id).catch((e) => {
      if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
      throw e;
    }),
    getChurchTimezone(),
  ]);
  const [followUps, timeline] = await Promise.all([
    can(actor, "followup:read") ? memberFollowUps(actor, m.id) : Promise.resolve(null),
    getMemberTimeline(actor, m.id),
  ]);
  const today = toDateInput(new Date(), tz);

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title={`${m.firstName} ${m.lastName}`}
        back={{ href: "/admin/miembros", label: "Miembros" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[m.status]}>{MEMBER_STATUS_LABEL[m.status]}</Badge>
            {m.isMinor ? <Badge tone="warning">Menor de edad</Badge> : null}
            {m.position ? <span>{m.position}</span> : null}
            {m.birthDate ? <span>Cumpleaños: {formatDateOnly(m.birthDate).slice(0, 5)}</span> : null}
          </span>
        }
        actions={
          can(actor, "members:deactivate") ? (
            m.status === "INACTIVE" ? (
              <ActionButton action={setMemberStatusAction.bind(null, m.id, "ACTIVE")} variant="secondary">Reactivar</ActionButton>
            ) : (
              <ActionButton action={setMemberStatusAction.bind(null, m.id, "INACTIVE")} confirmMessage="¿Marcar como inactivo? El registro y su historial se conservan." variant="danger">
                Desactivar
              </ActionButton>
            )
          ) : null
        }
      />
      {saved ? <Alert tone="success">Registro guardado.</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card title="Datos">
          {can(actor, "members:update") ? (
            <MemberForm
              action={updateMemberAction.bind(null, m.id)}
              values={m}
              canNotes={can(actor, "members:read_notes")}
              canStatus={can(actor, "members:deactivate")}
              submitLabel="Guardar cambios"
            />
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Teléfono</dt><dd>{m.phone ?? "—"}</dd>
              <dt className="text-muted">Correo</dt><dd>{m.email ?? "—"}</dd>
              <dt className="text-muted">Ingreso</dt><dd>{m.joinDate ? formatDateOnly(m.joinDate) : "—"}</dd>
            </dl>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Ministerios">
            {m.ministryMemberships.length === 0 ? (
              <p className="text-sm text-muted">No participa en ministerios.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {m.ministryMemberships.map((mm) => (
                  <li key={mm.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/ministerios/${mm.ministry.id}`} className="text-primary hover:underline">{mm.ministry.name}</Link>
                    <span className="flex items-center gap-1">
                      {mm.role === "COORDINATOR" ? <Badge tone="accent">Coordina</Badge> : null}
                      {mm.endDate ? <Badge>Hasta {formatDateOnly(mm.endDate)}</Badge> : <Badge tone="success">Vigente</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {m.attendance ? (
            <Card title="Asistencia reciente">
              {m.attendance.length === 0 ? (
                <EmptyState title="Sin registros" />
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {m.attendance.map((r) => (
                    <li key={r.event.id} className="flex items-center justify-between gap-2">
                      <Link href={`/admin/asistencia/${r.event.id}`} className="min-w-0 truncate hover:underline">
                        {r.event.title} <span className="text-muted">· {formatDate(r.event.startsAt, tz)}</span>
                      </Link>
                      {r.status === "PRESENT" ? <Badge tone="success">Presente</Badge> : <Badge tone="danger">Ausente</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          {can(actor, "users:read") ? (
            <Card title="Acceso al portal" description="Permite que la persona consulte sus propios datos, ministerios, asistencia y aportaciones.">
              {m.user ? (
                <div className="flex flex-col gap-2 text-sm">
                  <p>
                    Cuenta: <span className="font-medium">{m.user.email}</span> {m.user.isActive ? <Badge tone="success">Activa</Badge> : <Badge>Inactiva</Badge>}
                  </p>
                  <Link href={`/admin/usuarios/${m.user.id}`} className="text-primary hover:underline">Administrar cuenta →</Link>
                </div>
              ) : m.isMinor ? (
                <p className="text-sm text-muted">No se crean cuentas para menores de edad.</p>
              ) : m.status === "INACTIVE" ? (
                <p className="text-sm text-muted">Reactiva a la persona para darle acceso.</p>
              ) : can(actor, "users:create") && can(actor, "roles:assign") ? (
                <ActionForm action={createPortalAccountAction.bind(null, m.id)}>
                  <Field label="Correo para iniciar sesión" name="email" type="email" defaultValue={m.email ?? ""} required />
                  <Field label="Contraseña inicial" name="password" type="password" autoComplete="new-password" required hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`} />
                  <SubmitButton>Crear acceso</SubmitButton>
                </ActionForm>
              ) : (
                <p className="text-sm text-muted">Sin acceso al portal.</p>
              )}
            </Card>
          ) : null}

          <Card title="Historial">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted">
              <dt>Creado</dt><dd>{formatDateTime(m.createdAt, tz)}{m.createdBy ? ` por ${m.createdBy.name}` : ""}</dd>
              <dt>Actualizado</dt><dd>{formatDateTime(m.updatedAt, tz)}{m.updatedBy ? ` por ${m.updatedBy.name}` : ""}</dd>
            </dl>
          </Card>
        </div>
      </div>

      {followUps ? (
        <section id="seguimiento" className="scroll-mt-20">
          <Card title="Seguimiento" description="Contactos pastorales con esta persona y próximas acciones.">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              {followUps.length === 0 ? (
                <EmptyState title="Sin contactos registrados" description={m.status === "VISITOR" ? "Es visitante: registra el primer contacto para darle la bienvenida." : undefined} />
              ) : (
                <ol className="relative flex flex-col gap-3 border-l-2 border-border pl-5">
                  {followUps.map((f) => (
                    <li key={f.id} className="relative">
                      <span aria-hidden className="absolute -left-[27px] top-1.5 size-3 rounded-full bg-accent ring-4 ring-surface" />
                      <p className="text-sm"><span className="font-medium">{FOLLOWUP_KIND_LABEL[f.kind]}</span> · {formatDateOnly(f.contactedOn)}{f.createdBy ? <span className="text-muted"> · {f.createdBy.name}</span> : null}</p>
                      {f.notes ? <p className="mt-1 whitespace-pre-line text-sm text-muted">{f.notes}</p> : null}
                      {f.nextAction || f.nextActionOn ? <p className="mt-1 text-xs text-accent">Siguiente: {f.nextAction ?? "seguimiento"}{f.nextActionOn ? ` (${formatDateOnly(f.nextActionOn)})` : ""}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
              {can(actor, "followup:write") ? <FollowUpForm memberId={m.id} today={today} /> : null}
            </div>
          </Card>
        </section>
      ) : null}
      <section id="linea-tiempo" className="scroll-mt-20">
        <Card title="Línea de tiempo" description="Relación histórica de esta persona con la iglesia. Solo muestra información permitida por tu rol.">
          {timeline.length === 0 ? (
            <EmptyState title="Sin actividad registrada" />
          ) : (
            <ol className="relative flex flex-col gap-4 border-l-2 border-border pl-6">
              {timeline.map((item, index) => (
                <li key={`${item.kind}-${item.date.toISOString()}-${index}`} className="relative">
                  <span aria-hidden className="absolute -left-[31px] top-1 size-3 rounded-full bg-primary ring-4 ring-surface" />
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{item.kind} · {formatDate(item.date, tz)}</p>
                  {item.href ? <Link href={item.href} className="font-medium text-primary hover:underline">{item.title}</Link> : <p className="font-medium">{item.title}</p>}
                  {item.detail ? <p className="text-sm text-muted">{item.detail}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </section>
    </div>
  );
}
