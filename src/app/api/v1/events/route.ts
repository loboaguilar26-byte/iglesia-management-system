import { apiRoute, readJson } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { createEvent, listEventsInRange, listUpcomingEvents } from "@/modules/events/service";

/** `?from=…&to=…` (ISO) para un rango; sin parámetros, los próximos eventos. */
export const GET = apiRoute(async ({ request, actor }) => {
  const sp = new URL(request.url).searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (from || to) {
    const f = new Date(from ?? "");
    const t = new Date(to ?? "");
    if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime()) || t <= f) throw new AppError("VALIDATION_ERROR", "Rango de fechas inválido.");
    return listEventsInRange(actor, f, t);
  }
  return listUpcomingEvents(actor);
});

export const POST = apiRoute(async ({ request, actor }) => createEvent(actor, await readJson(request)), { status: 201 });
