import type { Metadata } from "next";
import { CalendarPlus, MapPin, UsersRound } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, EmptyState } from "@/components/ui/layout";
import { formatLongDate, formatTime, zonedParts } from "@/lib/dates";
import { requirePortalActor } from "@/lib/session";
import { myAgenda, RSVP_LABEL } from "@/modules/portal/engagement";
import { getChurchTimezone } from "@/modules/settings/service";
import { setRsvpAction } from "../actions";
import { DateBlock, PortalHeading, portalBlocker } from "../portal-ui";

export const metadata: Metadata = { title: "Mi agenda" };

const RESPONSES = ["GOING", "MAYBE", "NOT_GOING"] as const;

export default async function AgendaPage() {
  const actor = await requirePortalActor();
  const blocked = portalBlocker(actor);
  if (blocked) return blocked;
  const [events, tz] = await Promise.all([myAgenda(actor), getChurchTimezone()]);
  const confirmed = events.filter((e) => e.myResponse === "GOING").length;

  // Agrupa por semana (lunes) para leer la agenda de un vistazo.
  const groups = new Map<string, typeof events>();
  for (const e of events) {
    const p = zonedParts(e.startsAt, tz);
    const monday = new Date(Date.UTC(p.year, p.month - 1, p.day - ((p.weekday + 6) % 7)));
    const key = monday.toISOString().slice(0, 10);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return (
    <div className="flex flex-col gap-6">
      <PortalHeading
        eyebrow="Agenda"
        title="Próximos 60 días"
        description="Confirma a qué reuniones asistirás y agrégalas al calendario de tu teléfono. Tu respuesta ayuda a preparar lugares y materiales."
        actions={<Badge tone="success">{confirmed} confirmados</Badge>}
      />
      {events.length === 0 ? (
        <EmptyState title="No hay eventos próximos" description="Cuando se programen reuniones públicas o de tus ministerios aparecerán aquí." />
      ) : (
        [...groups.entries()].map(([week, list]) => (
          <section key={week} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Semana del {new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${week}T00:00:00Z`))}
            </h2>
            <ul className="stagger grid gap-3 lg:grid-cols-2">
              {list.map((e) => (
                <li key={e.id} className={`lift flex flex-col gap-3 rounded-2xl border bg-surface p-4 shadow-sm ${e.myResponse === "GOING" ? "border-success/40" : "border-border"}`}>
                  <div className="flex items-start gap-4">
                    <DateBlock date={e.startsAt} tz={tz} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{e.title}</p>
                      <p className="text-sm capitalize text-muted">{formatLongDate(e.startsAt, tz)} · {formatTime(e.startsAt, tz)} – {formatTime(e.endsAt, tz)} h</p>
                      {e.location ? <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted"><MapPin aria-hidden className="size-3.5" />{e.location}</p> : null}
                    </div>
                    <Badge tone="accent">{e.ministry?.name ?? e.type.name}</Badge>
                  </div>
                  {e.description ? <p className="line-clamp-2 text-sm text-muted">{e.description}</p> : null}
                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {RESPONSES.map((r) => (
                      <ActionButton key={r} action={setRsvpAction.bind(null, e.id, r)} variant={e.myResponse === r ? (r === "GOING" ? "primary" : "accent") : "secondary"}>
                        {RSVP_LABEL[r]}
                      </ActionButton>
                    ))}
                    <span className="ml-auto flex items-center gap-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1"><UsersRound aria-hidden className="size-3.5" />{e.going} asistirán</span>
                      <a href={`/mi-cuenta/agenda/${e.id}/ics`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline" download>
                        <CalendarPlus aria-hidden className="size-3.5" /> Calendario
                      </a>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
