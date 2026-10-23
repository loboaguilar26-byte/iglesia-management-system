import { apiRoute, readJson } from "@/lib/api";
import { setUserActive } from "@/modules/users/service";

export const PUT = apiRoute<{ id: string }>(async ({ request, actor, params }) =>
  setUserActive(actor, params.id, await readJson(request)),
);
