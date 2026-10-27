import { apiRoute, readJson } from "@/lib/api";
import { getEvent, updateEvent } from "@/modules/events/service";
export const GET = apiRoute<{ id: string }>(async ({ actor, params }) => getEvent(actor, params.id));
export const PUT = apiRoute<{ id: string }>(async ({ request, actor, params }) => updateEvent(actor, params.id, await readJson(request)));
