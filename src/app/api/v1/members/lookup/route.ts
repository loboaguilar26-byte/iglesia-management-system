import { apiRoute } from "@/lib/api";
import { lookupMembers } from "@/modules/members/service";

/** Búsqueda mínima de personas (id y nombre) para selectores. */
export const GET = apiRoute(async ({ request, actor }) => {
  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";
  const ministryId = params.get("ministryId") ?? undefined;
  return lookupMembers(actor, q.slice(0, 100), { ministryId });
});
