import { apiRoute } from "@/lib/api";
import { lookupMembers } from "@/modules/members/service";

/** Búsqueda mínima de personas (id y nombre) para selectores. */
export const GET = apiRoute(async ({ request, actor }) => {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return lookupMembers(actor, q.slice(0, 100));
});
