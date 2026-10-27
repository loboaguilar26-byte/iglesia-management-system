import type { Metadata } from "next";
import { AlertTriangle, PhoneCall, UserPlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { formatDate, formatDateOnly, toDateInput } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { FOLLOWUP_KIND_LABEL, followUpBoard } from "@/modules/followups/service";
import { getChurchTimezone } from "@/modules/settings/service";
import { FollowUpForm } from "./followup-form";

export const metadata: Metadata = { title: "Seguimiento" };

export default async function FollowUpPage() {
  const actor = await requirePageActor();
  if (!can(actor, "followup:read")) notFound();
  const tz = await getChurchTimezone();
  const today = toDateInput(new Date(), tz);
  const { uncontacted, pending, recentVisitors } = await followUpBoard(actor, today);
  const overdue = pending.filter((p) => p.overdue).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Seguimiento de visitantes"
        description="Que nadie que nos visite quede sin atención: registra cada contacto y la siguiente acción."
        actions={can(actor, "members:create") ? <Link href="/admin/miembros/nuevo" className={buttonClass()}>Registrar visitante</Link> : null}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Sin contactar" value={uncontacted.length} detail="Visitantes sin ningún contacto registrado" icon={<UserPlus className="size-4" />} />
        <StatCard label="Acciones pendientes" value={pending.length} detail={`${overdue} vencidas · resto en los próximos 7 días`} icon={<PhoneCall className="size-4" />} />
        <StatCard label="Visitantes recientes" value={recentVisitors.length} detail="Registrados en los últimos 60 días" icon={<AlertTriangle className="size-4" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Acciones pendientes" description="Próxima acción del último contacto de cada persona.">
            {pending.length === 0 ? (
              <EmptyState title="No hay acciones pendientes" />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {pending.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/admin/miembros/${p.member.id}#seguimiento`} className="font-medium hover:text-primary">{p.member.firstName} {p.member.lastName}</Link>
                      <p className="text-sm text-muted">{p.nextAction ?? "Dar seguimiento"} · último contacto: {FOLLOWUP_KIND_LABEL[p.kind].toLowerCase()} el {formatDateOnly(p.contactedOn)}</p>
                    </div>
                    <Badge tone={p.overdue ? "danger" : "warning"}>{p.overdue ? "Vencida" : "Para"} {formatDateOnly(p.nextActionOn!)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Visitantes sin contactar">
            {uncontacted.length === 0 ? (
              <EmptyState title="¡Todos los visitantes tienen al menos un contacto!" />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {uncontacted.map((m) => (
                  <li key={m.id} className="rounded-xl border border-border p-4">
                    <Link href={`/admin/miembros/${m.id}#seguimiento`} className="font-medium hover:text-primary">{m.firstName} {m.lastName}</Link>
                    <p className="text-sm text-muted">{[m.phone, m.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
                    <p className="mt-1 text-xs text-muted">Registrado el {formatDate(m.createdAt, tz)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Visitantes recientes (60 días)">
            {recentVisitors.length === 0 ? (
              <EmptyState title="Sin visitantes recientes" />
            ) : (
              <ul className="flex flex-col divide-y divide-border text-sm">
                {recentVisitors.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <Link href={`/admin/miembros/${m.id}`} className="font-medium hover:text-primary">{m.firstName} {m.lastName}</Link>
                    <span className="flex gap-2">
                      <Badge tone="info">{m._count.attendances} asistencias</Badge>
                      <Badge tone={m._count.followUps ? "success" : "danger"}>{m._count.followUps} contactos</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {can(actor, "followup:write") ? (
          <Card title="Registrar contacto">
            <FollowUpForm today={today} />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
