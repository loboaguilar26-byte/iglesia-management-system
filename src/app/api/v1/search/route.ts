import { apiRoute } from "@/lib/api";
import { globalSearch } from "@/modules/search/service";

export const GET = apiRoute(async ({ request, actor }) => {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return globalSearch(actor, q.slice(0, 100));
});
