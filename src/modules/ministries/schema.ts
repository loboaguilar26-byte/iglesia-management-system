import { z } from "zod";

export const ministrySchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre").max(100),
  description: z.string().trim().max(2000).optional().transform((v) => (v ? v : null)),
  isPublic: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()),
  chapelId: z.string().optional().transform((v) => (v ? v : null)),
});

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").transform((v) => new Date(`${v}T00:00:00Z`));

export const addMembershipSchema = z.object({
  memberId: z.string().min(1, "Selecciona una persona"),
  role: z.enum(["MEMBER", "COORDINATOR"]).default("MEMBER"),
  startDate: date,
});

export const endMembershipSchema = z.object({ endDate: date });

export const MINISTRY_ROLE_LABEL = { MEMBER: "Integrante", COORDINATOR: "Coordinador(a)" } as const;
