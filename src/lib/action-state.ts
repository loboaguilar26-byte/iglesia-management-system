import { unstable_rethrow } from "next/navigation";
import { AppError } from "./errors";

export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

/** Convierte errores de servicio en estado para formularios (Server Actions). */
export function toActionState(error: unknown): ActionState {
  unstable_rethrow(error);
  if (error instanceof AppError) {
    return { ok: false, message: error.message, fieldErrors: error.details };
  }
  console.error(error);
  return { ok: false, message: "Ocurrió un error inesperado." };
}
