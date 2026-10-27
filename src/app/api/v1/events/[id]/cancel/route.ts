import { apiRoute, readJson } from "@/lib/api";
import { cancelEvent } from "@/modules/events/service";
export const PUT = apiRoute<{ id: string }>(async ({ request, actor, params }) => cancelEvent(actor, params.id, await readJson(request)));
