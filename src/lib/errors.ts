export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "Debes iniciar sesión.",
  FORBIDDEN: "No tienes permiso para esta acción.",
  NOT_FOUND: "No se encontró el recurso.",
  VALIDATION_ERROR: "Revisa los datos capturados.",
  CONFLICT: "La operación entra en conflicto con datos existentes.",
  RATE_LIMITED: "Demasiados intentos. Espera un momento.",
  INTERNAL: "Ocurrió un error inesperado.",
};

/** Error de negocio con mensaje seguro para mostrar al usuario. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = "AppError";
  }
}

export function toErrorBody(error: unknown) {
  if (error instanceof AppError) {
    return {
      status: HTTP_STATUS[error.code],
      body: { error: { code: error.code, message: error.message, details: error.details } },
    };
  }
  console.error(error);
  return {
    status: 500,
    body: { error: { code: "INTERNAL" as const, message: DEFAULT_MESSAGES.INTERNAL } },
  };
}
