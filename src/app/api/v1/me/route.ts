import { apiRoute } from "@/lib/api";
import { requireActor } from "@/lib/authz";

/** Usuario actual con roles y permisos efectivos (útil para clientes web y móviles). */
export const GET = apiRoute(async ({ actor }) => {
  const a = requireActor(actor);
  return {
    id: a.userId,
    name: a.name,
    email: a.email,
    roles: a.roles,
    permissions: [...a.permissions].sort(),
  };
});
