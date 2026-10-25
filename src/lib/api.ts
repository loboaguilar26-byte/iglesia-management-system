import "server-only";
import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import type { Actor } from "./authz";
import { AppError, toErrorBody } from "./errors";
import { getActorFromHeaders } from "./session";

type Handler<C> = (ctx: { request: Request; actor: Actor | null; params: C }) => Promise<unknown>;

/**
 * Adaptador para rutas /api/v1: resuelve el actor, ejecuta el servicio y traduce errores al
 * formato uniforme { error: { code, message, details } }. La autorización la hace el servicio.
 */
export function apiRoute<C = Record<string, never>>(handler: Handler<C>, { status = 200 } = {}) {
  return async (request: Request, context: { params: Promise<C> }) => {
    try {
      const actor = await getActorFromHeaders(request.headers);
      const params = (await context?.params) ?? ({} as C);
      const data = await handler({ request, actor, params });
      return NextResponse.json({ data }, { status });
    } catch (error) {
      unstable_rethrow(error); // deja pasar errores internos de Next.js (prerender, redirect…)
      const { status: code, body } = toErrorBody(error);
      return NextResponse.json(body, { status: code });
    }
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "El cuerpo de la petición debe ser JSON válido.");
  }
}
