import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { Alert } from "@/components/ui/alert";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { formatDate, formatDateOnly, formatDateTime } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { requirePageActor } from "@/lib/session";
import { MEMBER_STATUS_LABEL } from "@/modules/members/schema";
import { getMember } from "@/modules/members/service";
import { getChurchTimezone } from "@/modules/settings/service";
import { setMemberStatusAction, updateMemberAction } from "../actions";
import { MemberForm } from "../member-form";
import { statusTone } from "../status-tone";

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

          <Card title="Historial">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted">
              <dt>Creado</dt><dd>{formatDateTime(m.createdAt, tz)}{m.createdBy ? ` por ${m.createdBy.name}` : ""}</dd>
              <dt>Actualizado</dt><dd>{formatDateTime(m.updatedAt, tz)}{m.updatedBy ? ` por ${m.updatedBy.name}` : ""}</dd>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
