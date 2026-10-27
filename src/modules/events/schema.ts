import { z } from "zod";

const optional = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
export const eventInputSchema = z.object({
  title: z.string().trim().min(2, "Escribe el título").max(160),
  typeId: z.string().min(1, "Selecciona un tipo"),
  startsAt: z.string().min(1, "Indica el inicio"),
  endsAt: z.string().min(1, "Indica el fin"),
  location: optional(200),
  description: optional(4000),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  visitorCount: z.coerce.number().int().min(0).max(100000).default(0),
});
export const listEventsSchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25), q: z.string().trim().max(120).default(""), status: z.enum(["SCHEDULED", "CANCELLED", "COMPLETED"]).optional() });
export const cancelEventSchema = z.object({ reason: z.string().trim().min(3, "Escribe el motivo").max(500) });
export function parseEventDates(startsAt: string, endsAt: string) { const start = new Date(startsAt); const end = new Date(endsAt); if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new Error("La fecha final debe ser posterior a la inicial."); return { start, end }; }
