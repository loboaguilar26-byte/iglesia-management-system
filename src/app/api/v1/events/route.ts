import { apiRoute, readJson } from "@/lib/api";
import { createEvent, listEvents } from "@/modules/events/service";
export const GET = apiRoute(async ({ request, actor }) => listEvents(actor, Object.fromEntries(new URL(request.url).searchParams)));
export const POST = apiRoute(async ({ request, actor }) => createEvent(actor, await readJson(request)), { status: 201 });
