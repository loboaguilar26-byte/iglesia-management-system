import { apiRoute } from "@/lib/api";
import { getUser } from "@/modules/users/service";

export const GET = apiRoute<{ id: string }>(async ({ actor, params }) => getUser(actor, params.id));
