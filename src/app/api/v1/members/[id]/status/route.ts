import { apiRoute, readJson } from "@/lib/api";
import { setMemberActive } from "@/modules/members/service";

export const PUT = apiRoute<{ id: string }>(async ({ request, actor, params }) => setMemberActive(actor, params.id, await readJson(request)));
