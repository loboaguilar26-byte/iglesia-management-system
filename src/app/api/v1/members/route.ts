import { apiRoute, readJson } from "@/lib/api";
import { createMember, listMembers } from "@/modules/members/service";

export const GET = apiRoute(async ({ request, actor }) => listMembers(actor, Object.fromEntries(new URL(request.url).searchParams)));
export const POST = apiRoute(async ({ request, actor }) => createMember(actor, await readJson(request)), { status: 201 });
