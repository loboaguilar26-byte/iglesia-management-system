import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { AppError } from "./errors";

/*
 * Límite de envíos para formularios públicos (sin cuenta). Vive en memoria del proceso: no se
 * guarda la IP en ningún lado; solo un HMAC con una sal aleatoria que se pierde al reiniciar, así
 * que no sirve para identificar a nadie (importante para mensajes anónimos). Con varias instancias
 * cada una lleva su cuenta; para ese caso conviene un almacén compartido.
 */

const SALT = randomBytes(32);
const hits = new Map<string, number[]>();

function fingerprint(scope: string, ip: string | null) {
  // Sin IP confiable (p. ej., en desarrollo) todos comparten un mismo contador por formulario.
  return `${scope}:${ip ? createHmac("sha256", SALT).update(ip).digest("base64url").slice(0, 22) : "global"}`;
}

/** Lanza RATE_LIMITED si se superó `max` envíos en `windowMs` para este formulario y origen. */
export function throttle(scope: string, ip: string | null, { max, windowMs }: { max: number; windowMs: number }) {
  const key = fingerprint(scope, ip);
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  // Sin IP el límite se reparte entre todos: se amplía para no bloquear a personas distintas.
  const limit = ip ? max : max * 10;
  if (recent.length >= limit) {
    hits.set(key, recent);
    throw new AppError("RATE_LIMITED", "Recibimos muchos envíos seguidos. Espera unos minutos e inténtalo de nuevo.");
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, list] of hits) if (!list.some((t) => now - t < windowMs)) hits.delete(k);
  }
}
