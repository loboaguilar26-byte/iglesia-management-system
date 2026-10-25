import { z } from "zod";
import { AppError } from "./errors";

/** Valida en el servidor; ante error lanza VALIDATION_ERROR con mensajes por campo. */
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const { fieldErrors, formErrors } = z.flattenError(result.error);
    const details: Record<string, string[]> = {};
    for (const [field, messages] of Object.entries(fieldErrors) as [string, string[] | undefined][]) {
      if (messages?.length) details[field] = messages;
    }
    if (formErrors.length) details._form = formErrors;
    throw new AppError("VALIDATION_ERROR", undefined, details);
  }
  return result.data;
}
