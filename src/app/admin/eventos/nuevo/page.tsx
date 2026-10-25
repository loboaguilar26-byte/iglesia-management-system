import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui/layout";
import { can, canFully } from "@/lib/authz";
import { toLocalInput, zonedParts } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { getEvent, listEventTypes, ministryOptionsFor } from "@/modules/events/service";
import { getChurchTimezone } from "@/modules/settings/service";
import { createEventAction } from "../actions";
import { EventForm, type EventFormValues } from "../event-form";

export const metadata: Metadata = { title: "Nuevo evento" };

export default async function NewEventPage({ searchParams }: PageProps<"/admin/eventos/nuevo">) {
  const actor = await requirePageActor();
  if (!can(actor, "events:create")) notFound();
  const sp = await searchParams;
  const [types, ministries, tz] = await Promise.all([listEventTypes(), ministryOptionsFor(actor), getChurchTimezone()]);

  // Valores sugeridos: próximo domingo 10:00–12:00, o copia de un evento existente.
  let values: EventFormValues;
  const copyId = typeof sp.copiar === "string" ? sp.copiar : null;
  const source = copyId ? await getEvent(actor, copyId).catch(() => null) : null;
  if (source) {
    values = {
      title: source.title,
      typeId: source.typeId,
      startsAt: toLocalInput(source.startsAt, tz),
      endsAt: toLocalInput(source.endsAt, tz),
      location: source.location,
      description: source.description,
      visibility: source.visibility,
      ministryId: source.ministryId,
      responsibles: source.responsibles.map((r) => ({ id: r.member.id, name: `${r.member.firstName} ${r.member.lastName}` })),
    };
  } else {
    const p = zonedParts(new Date(), tz);
    const add = ((7 - p.weekday) % 7) || 7;
    const d = new Date(Date.UTC(p.year, p.month - 1, p.day + add));
    const day = d.toISOString().slice(0, 10);
    values = { startsAt: `${day}T10:00`, endsAt: `${day}T12:00`, typeId: types.find((t) => t.name === "Culto")?.id };
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={source ? "Duplicar evento" : "Nuevo evento"} back={{ href: "/admin/eventos", label: "Eventos" }} description={source ? "Ajusta la fecha y guarda para crear una copia." : undefined} />
      <Card>
        <EventForm action={createEventAction} values={values} types={types} ministries={ministries} requireMinistry={!canFully(actor, "events:create")} submitLabel="Crear evento" />
      </Card>
    </div>
  );
}
