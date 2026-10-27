import type { Metadata } from "next";
import { Clock, HandHeart, UsersRound } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { TextArea } from "@/components/ui/field";
import { Badge, Card, EmptyState } from "@/components/ui/layout";
import { formatDate, formatDateOnly, formatLongDate } from "@/lib/dates";
import { requirePortalActor } from "@/lib/session";
import { myMinistriesOverview } from "@/modules/portal/engagement";
import { getChurchTimezone } from "@/modules/settings/service";
import { requestToJoinAction, withdrawJoinRequestAction } from "../actions";
import { PortalHeading, portalBlocker } from "../portal-ui";

export const metadata: Metadata = { title: "Mis ministerios" };

const REQUEST_STATUS = {
  PENDING: { label: "Pendiente", tone: "warning" },
  APPROVED: { label: "Aprobada", tone: "success" },
  REJECTED: { label: "No aprobada", tone: "danger" },
  WITHDRAWN: { label: "Retirada", tone: "neutral" },
} as const;

export default async function MinistriesPage() {
  const actor = await requirePortalActor();
  const blocked = portalBlocker(actor);
  if (blocked) return blocked;
  const [o, tz] = await Promise.all([myMinistriesOverview(actor), getChurchTimezone()]);

  return (
    <div className="flex flex-col gap-8">
      <PortalHeading
        eyebrow="Servir"
        title="Ministerios"
        description="Los ministerios en los que participas y los que puedes conocer. Envía una solicitud y el equipo del ministerio te contactará."
      />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Donde sirvo</h2>
        {o.mine.length === 0 ? (
          <EmptyState title="Aún no participas en un ministerio" description="Explora los ministerios de abajo y solicita unirte al que te interese." />
        ) : (
          <ul className="stagger grid gap-4 md:grid-cols-2">
            {o.mine.map((mm) => (
              <li key={mm.ministry.id} className="lift rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent"><HandHeart aria-hidden className="size-5" /></span>
                    <div>
                      <p className="font-semibold">{mm.ministry.name}</p>
                      <p className="text-xs text-muted">Desde {formatDateOnly(mm.startDate)} · {mm.ministry._count.memberships} integrantes</p>
                    </div>
                  </div>
                  <Badge tone={mm.role === "COORDINATOR" ? "accent" : "info"}>{mm.role === "COORDINATOR" ? "Coordinas" : "Integrante"}</Badge>
                </div>
                {mm.ministry.description ? <p className="mt-3 line-clamp-3 text-sm text-muted">{mm.ministry.description}</p> : null}
                {mm.ministry.events.length ? (
                  <ul className="mt-4 flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
                    {mm.ministry.events.map((e) => (
                      <li key={e.id} className="flex items-center gap-2"><Clock aria-hidden className="size-3.5 text-accent" /><span className="truncate">{e.title}</span><span className="ml-auto shrink-0 capitalize text-muted">{formatLongDate(e.startsAt, tz)}</span></li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Conoce otros ministerios</h2>
        {o.catalog.length === 0 ? (
          <EmptyState title="Ya participas en todos los ministerios activos" />
        ) : (
          <ul className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {o.catalog.map((m) => (
              <li key={m.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{m.name}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-muted"><UsersRound aria-hidden className="size-3.5" />{m._count.memberships}</span>
                </div>
                <p className="line-clamp-3 flex-1 text-sm text-muted">{m.description ?? "Pregunta al equipo del ministerio cómo puedes servir."}</p>
                {m.pending ? (
                  <Badge tone="warning">Solicitud enviada</Badge>
                ) : (
                  <details className="group rounded-xl border border-border bg-background/60 p-3 open:shadow-sm">
                    <summary className="cursor-pointer list-none text-sm font-medium text-primary marker:hidden">Quiero unirme →</summary>
                    <ActionForm action={requestToJoinAction.bind(null, m.id)} className="mt-3 flex flex-col gap-3">
                      <TextArea label="Mensaje (opcional)" name="message" rows={2} hint="Cuéntales tus dones, experiencia o disponibilidad." />
                      <SubmitButton>Enviar solicitud</SubmitButton>
                    </ActionForm>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {o.requests.length ? (
        <Card title="Mis solicitudes">
          <ul className="flex flex-col divide-y divide-border">
            {o.requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{r.ministry.name}</span>
                  <span className="text-muted"> · enviada {formatDate(r.createdAt, tz)}</span>
                  {r.responseNote ? <span className="block text-muted">Respuesta: {r.responseNote}</span> : null}
                </span>
                <Badge tone={REQUEST_STATUS[r.status].tone}>{REQUEST_STATUS[r.status].label}</Badge>
                {r.status === "PENDING" ? (
                  <ActionButton action={withdrawJoinRequestAction.bind(null, r.id)} variant="ghost" confirmMessage="¿Retirar esta solicitud?">Retirar</ActionButton>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
