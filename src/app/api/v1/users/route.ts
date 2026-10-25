import { apiRoute, readJson } from "@/lib/api";
import { createUser, listUsers } from "@/modules/users/service";

export const GET = apiRoute(async ({ request, actor }) => {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  return listUsers(actor, query);
});

export const POST = apiRoute(async ({ request, actor }) => createUser(actor, await readJson(request)), {
  status: 201,
});
