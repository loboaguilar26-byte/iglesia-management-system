import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberPicker } from "@/components/member-picker";
import { ActionButton } from "@/components/ui/action-button";
import { ChapelSelect } from "@/components/chapel-select";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, SelectField, TextArea } from "@/components/ui/field";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/layout";
import { can, canFully } from "@/lib/authz";
import { formatDate, formatDateOnly, toDateInput } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { requirePageActor } from "@/lib/session";
import { MINISTRY_ROLE_LABEL } from "@/modules/ministries/schema";
import { getMinistry } from "@/modules/ministries/service";
import { pendingJoinRequests } from "@/modules/portal/engagement";
import { getChurchTimezone } from "@/modules/settings/service";
import { addMembershipAction, endMembershipAction, reviewJoinRequestAction, setMinistryActiveAction, updateMinistryAction } from "../actions";

export const metadata: Metadata = { title: "Ministerio" };

export default async function MinistryPage({ params }: PageProps<"/admin/ministerios/[id]">) {
  const actor = await requirePageActor();
  const { id } = await params;
  const [{ ministry: m }, tz] = await Promise.all([
    getMinistry(actor, id).catch((e) => {
      if (e instanceof AppError && (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")) notFound();
      throw e;
    }),
    getChurchTimezone(),
  ]);
  const today = toDateInput(new Date(), tz);
  const current = m.memberships.filter((x) => !x.endDate);
  const past = m.memberships.filter((x) => x.endDate);
  const canManage = can(actor, "ministries:manage_members");
  const fullManage = canFully(actor, "ministries:manage_members");
  const requests = canManage && m.isActive ? await pendingJoinRequests(actor, m.id).catch(() => []) : [];

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title={m.name}
        back={{ href: "/admin/ministerios", label: "Ministerios" }}
        description={m.isActive ? m.description : "Ministerio inactivo."}
        actions={
          can(actor, "ministries:update") ? (
            <ActionButton action={setMinistryActiveAction.bind(null, m.id, !m.isActive)} variant={m.isActive ? "danger" : "secondary"} confirmMessage={m.isActive ? "¿Desactivar este ministerio? Se conserva su historial." : undefined}>
              {m.isActive ? "Desactivar" : "Reactivar"}
            </ActionButton>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card title={`Integrantes vigentes (${current.length})`}>
          {current.length === 0 ? (
            <EmptyState title="Sin integrantes" />
          ) : (
            <ul className="divide-y divide-border">
              {current.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/admin/miembros/${x.member.id}`} className="font-medium hover:underline">
                      {x.member.firstName} {x.member.lastName}
                    </Link>
                    <p className="text-xs text-muted">Desde {formatDateOnly(x.startDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={x.role === "COORDINATOR" ? "accent" : "info"}>{MINISTRY_ROLE_LABEL[x.role]}</Badge>
                    {canManage && (fullManage || x.role !== "COORDINATOR") ? (
                      <details className="relative">
                        <summary className="cursor-pointer list-none rounded-md px-2 py-1 text-sm text-primary hover:bg-surface-2">Finalizar</summary>
                        <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-border bg-surface p-3 shadow-lg">
                          <ActionForm action={endMembershipAction.bind(null, m.id, x.id)}>
                            <Field label="Fecha de fin" name="endDate" type="date" defaultValue={today} required />
                            <SubmitButton variant="danger">Finalizar participación</SubmitButton>
                          </ActionForm>
                        </div>
                      </details>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {past.length ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-primary">Historial ({past.length})</summary>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                {past.map((x) => (
                  <li key={x.id}>
                    {x.member.firstName} {x.member.lastName} · {MINISTRY_ROLE_LABEL[x.role]} · {formatDateOnly(x.startDate)} – {formatDateOnly(x.endDate!)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </Card>

        <div className="flex flex-col gap-6">
          {requests.length ? (
            <Card title={`Solicitudes para unirse (${requests.length})`} description="Enviadas por miembros desde su portal.">
              <ul className="flex flex-col gap-4">
                {requests.map((r) => (
                  <li key={r.id} className="rounded-xl border border-accent/40 bg-accent-soft/30 p-3">
                    <p className="font-medium">
                      <Link href={`/admin/miembros/${r.member.id}`} className="hover:text-primary">{r.member.firstName} {r.member.lastName}</Link>
                    </p>
                    <p className="text-xs text-muted">Enviada {formatDate(r.createdAt, tz)}</p>
                    {r.message ? <p className="mt-2 whitespace-pre-line text-sm">“{r.message}”</p> : null}
                    <div className="mt-3 flex flex-wrap items-start gap-2">
                      <ActionForm action={reviewJoinRequestAction.bind(null, m.id, r.id, "APPROVED")} className="flex">
                        <SubmitButton>Aprobar</SubmitButton>
                      </ActionForm>
                      <details className="text-sm">
                        <summary className="cursor-pointer rounded-xl px-3 py-2 text-muted hover:bg-surface-2">Rechazar…</summary>
                        <ActionForm action={reviewJoinRequestAction.bind(null, m.id, r.id, "REJECTED")} className="mt-2 flex flex-col gap-2">
                          <TextArea label="Respuesta para la persona (opcional)" name="note" rows={2} />
                          <SubmitButton variant="danger">Rechazar solicitud</SubmitButton>
                        </ActionForm>
                      </details>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {canManage && m.isActive ? (
            <Card title="Agregar integrante">
              <ActionForm action={addMembershipAction.bind(null, m.id)}>
                <MemberPicker name="memberId" label="Persona" ministryId={m.id} />
                <SelectField
                  label="Función"
                  name="role"
                  defaultValue="MEMBER"
                  options={[{ value: "MEMBER", label: "Integrante" }, ...(fullManage ? [{ value: "COORDINATOR", label: "Coordinador(a)" }] : [])]}
                />
                <Field label="Fecha de inicio" name="startDate" type="date" defaultValue={today} required />
                <SubmitButton>Agregar</SubmitButton>
              </ActionForm>
            </Card>
          ) : null}

          <Card title="Actividades recientes">
            {m.events.length === 0 ? (
              <p className="text-sm text-muted">Sin eventos vinculados.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {m.events.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <Link href={`/admin/eventos/${e.id}`} className="truncate hover:underline">{e.title}</Link>
                    <span className="shrink-0 text-muted">{formatDate(e.startsAt, tz)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {can(actor, "ministries:update") ? (
            <Card title="Editar">
              <ActionForm action={updateMinistryAction.bind(null, m.id)}>
                <Field label="Nombre" name="name" defaultValue={m.name} required />
                <TextArea label="Descripción" name="description" defaultValue={m.description ?? ""} rows={3} />
                <ChapelSelect defaultValue={m.chapelId} />
                <CheckboxField label="Mostrar en el sitio público" name="isPublic" defaultChecked={m.isPublic} hint="Solo nombre y descripción." />
                <SubmitButton>Guardar</SubmitButton>
              </ActionForm>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
