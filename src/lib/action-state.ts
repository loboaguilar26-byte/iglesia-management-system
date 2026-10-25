import { unstable_rethrow } from "next/navigation";
import { AppError } from "./errors";

export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Valores enviados (sin contraseñas) para no perder lo capturado cuando hay errores. */
  values?: Record<string, string>;
};

function formValues(form?: FormData): Record<string, string> | undefined {
  if (!form) return undefined;
  const values: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string" && !/pass/i.test(key) && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

/** Convierte errores de servicio en estado para formularios (Server Actions). */
export function toActionState(error: unknown, form?: FormData): ActionState {
  unstable_rethrow(error);
  if (error instanceof AppError) {
    return { ok: false, message: error.message, fieldErrors: error.details, values: formValues(form) };
  }
  console.error(error);
  return { ok: false, message: "Ocurrió un error inesperado.", values: formValues(form) };
}

/** Convierte FormData en objeto plano; las claves repetidas (checkbox múltiples) se vuelven arreglos. */
export function formToObject(form: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const all = form.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = all.length > 1 || key.endsWith("[]") ? all : (all[0] ?? "");
  }
  return out;
}
