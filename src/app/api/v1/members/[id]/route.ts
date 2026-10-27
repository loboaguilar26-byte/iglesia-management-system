import { apiRoute, readJson } from "@/lib/api";
import { getMember, updateMember } from "@/modules/members/service";

export const GET = apiRoute<{ id: string }>(async ({ actor, params }) => getMember(actor, params.id));
export const PUT = apiRoute<{ id: string }>(async ({ request, actor, params }) => updateMember(actor, params.id, await readJson(request)));
