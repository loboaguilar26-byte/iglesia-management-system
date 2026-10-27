import { z } from "zod";

const local = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha y hora inválidas");
const ids = z.preprocess((v) => (v === undefined || v === "" ? [] : Array.isArray(v) ? v : [v]), z.array(z.string().min(1)).max(20));

export const eventSchema = z
  .object({
    title: z.string().trim().min(3, "Escribe un título").max(150),
    typeId: z.string().min(1, "Selecciona el tipo"),
    startsAt: local,
    endsAt: local,
    location: z.string().trim().max(200).optional().transform((v) => (v ? v : null)),
    description: z.string().trim().max(5000).optional().transform((v) => (v ? v : null)),
    visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
    ministryId: z.string().optional().transform((v) => (v ? v : null)),
    responsibles: ids,
    chapelId: z.string().optional().transform((v) => (v ? v : null)),
  })
  .refine((e) => e.endsAt > e.startsAt, { message: "Debe terminar después de iniciar", path: ["endsAt"] });

export const cancelSchema = z.object({
  reason: z.string().trim().min(3, "Indica el motivo").max(500),
});

export const EVENT_STATUS_LABEL = { SCHEDULED: "Programado", CANCELLED: "Cancelado", COMPLETED: "Realizado" } as const;

/** Estado para mostrar: un evento programado que ya terminó se presenta como realizado. */
export function displayStatus(e: { status: keyof typeof EVENT_STATUS_LABEL; endsAt: Date }, now: Date) {
  return e.status === "SCHEDULED" && e.endsAt < now ? "COMPLETED" : e.status;
}
export const VISIBILITY_LABEL = { PUBLIC: "Público", PRIVATE: "Interno" } as const;
