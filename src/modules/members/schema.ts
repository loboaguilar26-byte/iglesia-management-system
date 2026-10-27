import { z } from "zod";

export const MEMBER_STATUSES = ["VISITOR", "ACTIVE", "INACTIVE"] as const;
export const MEMBER_STATUS_LABEL: Record<(typeof MEMBER_STATUSES)[number], string> = {
  VISITOR: "Visitante",
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

const optional = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`).optional().transform((v) => (v ? v : null));

const bool = z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean());

export const memberSchema = z.object({
  firstName: z.string().trim().min(1, "Escribe el nombre").max(80),
  lastName: z.string().trim().min(1, "Escribe los apellidos").max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .refine((v) => !v || /^[+\d][\d\s()-]{6,}$/.test(v), "Teléfono inválido")
    .transform((v) => (v ? v : null)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .refine((v) => !v || z.email().safeParse(v).success, "Correo inválido")
    .transform((v) => (v ? v : null)),
  joinDate: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida")
    .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null)),
  birthDate: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida")
    .refine((v) => !v || v <= new Date().toISOString().slice(0, 10), "No puede ser una fecha futura")
    .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null)),
  status: z.enum(MEMBER_STATUSES).default("ACTIVE"),
  chapelId: z.string().optional().transform((v) => (v ? v : null)),
  position: optional(80),
  isMinor: bool,
  notes: optional(4000),
  confirmDuplicate: bool,
});
export type MemberInput = z.infer<typeof memberSchema>;

export const listMembersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(MEMBER_STATUSES).or(z.literal("")).optional(),
  /** "principal" = sin capilla (sede principal). */
  chapelId: z.string().optional(),
  ministryId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
