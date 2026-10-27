import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, UsersRound } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { SelectField, TextArea } from "@/components/ui/field";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/ui/layout";
import { can } from "@/lib/authz";
import { formatDateTime } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { listPrayerRequests, PRAYER_STATUS_LABEL } from "@/modules/portal/engagement";
import { getChurchTimezone } from "@/modules/settings/service";
import { updatePrayerAction } from "./actions";

export const metadata: Metadata = { title: "Peticiones de oración" };

const TONE = { OPEN: "info", PRAYING: "accent", ANSWERED: "success", CLOSED: "neutral" } as const;
const FILTERS = [
  { key: "", label: "Activas" },
  { key: "OPEN", label: "Recibidas" },
  { key: "PRAYING", label: "En oración" },
  { key: "ANSWERED", label: "Respondidas" },
  { key: "CLOSED", label: "Cerradas" },
];

export default async function PrayerAdminPage({ searchParams }: PageProps<"/admin/oracion">) {
  const actor = await requirePageActor();
  if (!can(actor, "prayer:read")) notFound();
  const sp = await searchParams;
  const status = typeof sp.estado === "string" ? sp.estado : "";
  const [{ rows, counts }, tz] = await Promise.all([listPrayerRequests(actor, status), getChurchTimezone()]);
  const manage = can(actor, "prayer:manage");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Peticiones de oración"
        description="Enviadas por los miembros desde su portal. Información sensible: trátala con confidencialidad y no la compartas fuera del equipo pastoral."
      />
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Recibidas" value={counts.OPEN} detail="Sin atender todavía" />
        <StatCard label="En oración" value={counts.PRAYING} />
        <StatCard label="Respondidas" value={counts.ANSWERED} detail="Testimonios de respuesta" />
        <StatCard label="Cerradas" value={counts.CLOSED} />
      </div>
      <nav aria-label="Filtrar por estado" className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1 [scrollbar-width:none]">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/admin/oracion?estado=${f.key}` : "/admin/oracion"}
            aria-current={status === f.key ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${status === f.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:bg-surface-2"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <EmptyState title="No hay peticiones en esta vista" />
      ) : (
        <ul className="stagger grid gap-4 lg:grid-cols-2">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.subject}</p>
                  <p className="text-xs text-muted">
                    {can(actor, "members:read") ? <Link className="text-primary hover:underline" href={`/admin/miembros/${r.member.id}`}>{r.member.firstName} {r.member.lastName}</Link> : `${r.member.firstName} ${r.member.lastName}`} · {formatDateTime(r.createdAt, tz)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={r.isConfidential ? "warning" : "info"}>
                    <span className="inline-flex items-center gap-1">{r.isConfidential ? <Lock aria-hidden className="size-3" /> : <UsersRound aria-hidden className="size-3" />}{r.isConfidential ? "Confidencial" : "Compartible"}</span>
                  </Badge>
                  <Badge tone={TONE[r.status]}>{PRAYER_STATUS_LABEL[r.status]}</Badge>
                </div>
              </div>
              <p className="whitespace-pre-line text-sm">{r.body}</p>
              {r.handledBy ? <p className="text-xs text-muted">Atendida por {r.handledBy.name}</p> : null}
              {manage ? (
                <ActionForm action={updatePrayerAction.bind(null, r.id)} className="grid gap-3 border-t border-border pt-3 sm:grid-cols-[180px_1fr]">
                  <SelectField label="Estado" name="status" defaultValue={r.status} options={Object.entries(PRAYER_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
                  <TextArea label="Nota pastoral (la verá el miembro)" name="pastoralNote" rows={2} defaultValue={r.pastoralNote ?? ""} maxLength={1000} />
                  <div className="sm:col-span-2"><SubmitButton>Guardar</SubmitButton></div>
                </ActionForm>
              ) : r.pastoralNote ? (
                <p className="rounded-xl bg-accent-soft/60 p-3 text-sm">{r.pastoralNote}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
