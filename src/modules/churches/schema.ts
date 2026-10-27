import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(2, "Escribe un identificador")
  .max(80, "Máximo 80 caracteres")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones");

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal válido");

export const createChurchSchema = z
  .object({
    franchiseId: z.string().trim().min(1).optional(),
    franchiseName: z.string().trim().min(2, "Escribe el nombre de la franquicia").max(120).optional(),
    name: z.string().trim().min(2, "Escribe el nombre de la iglesia").max(120),
    slug: slugSchema,
    code: z.string().trim().max(30, "Máximo 30 caracteres").optional(),
    primaryColor: hexColorSchema.default("#1e3a5f"),
    accentColor: hexColorSchema.default("#d97706"),
  })
  .superRefine((value, context) => {
    if (!value.franchiseId && !value.franchiseName) {
      context.addIssue({
        code: "custom",
        path: ["franchiseName"],
        message: "Selecciona una franquicia o crea una nueva.",
      });
    }
  });

export const updateChurchSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre de la iglesia").max(120),
  code: z.string().trim().max(30, "Máximo 30 caracteres").optional(),
  primaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  fontFamily: z.string().trim().min(1).max(80),
  address: z.string().trim().max(240).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email("Escribe un correo válido").max(160).optional().or(z.literal("")),
  timezone: z.string().trim().min(1).max(80),
  currency: z.string().trim().length(3, "Usa una moneda de 3 letras").toUpperCase(),
  aboutText: z.string().trim().max(4000).optional(),
  scheduleText: z.string().trim().max(2000).optional(),
});

export const churchStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
});

export const churchTeamSchema = z.object({
  userId: z.string().trim().min(1, "Elige un usuario"),
  roleId: z.string().trim().min(1).optional(),
  isPrimary: z.boolean().default(false),
});
