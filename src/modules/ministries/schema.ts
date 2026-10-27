import { z } from "zod";

export const ministrySchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre").max(100),
  description: z.string().trim().max(2000).optional().transform((value) => value || null),
  isPublic: z.preprocess((value) => value === "on" || value === true || value === "true", z.boolean()),
});
