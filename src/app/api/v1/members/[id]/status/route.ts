import { apiRoute, readJson } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { setMemberStatus } from "@/modules/members/service";

/**
 * Cambia el estado de un miembro. Acepta `{ "status": "ACTIVE" | "VISITOR" | "INACTIVE" }`
 * o el formato `{ "isActive": boolean }` (activar / desactivar).
 */
export const PUT = apiRoute<{ id: string }>(async ({ request, actor, params }) => {
  const body = (await readJson(request)) as { status?: unknown; isActive?: unknown } | null;
  const status =
    body?.status === "ACTIVE" || body?.status === "VISITOR" || body?.status === "INACTIVE"
      ? body.status
      : typeof body?.isActive === "boolean"
        ? body.isActive
          ? "ACTIVE"
          : "INACTIVE"
        : null;
  if (!status) throw new AppError("VALIDATION_ERROR", "Indica `status` o `isActive`.");
  await setMemberStatus(actor, params.id, status);
  return { id: params.id, status };
});
