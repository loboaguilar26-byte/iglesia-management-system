import { apiRoute, readJson } from "@/lib/api";
import { updateUserRoles } from "@/modules/users/service";

export const PUT = apiRoute<{ id: string }>(async ({ request, actor, params }) =>
  updateUserRoles(actor, params.id, await readJson(request)),
);
