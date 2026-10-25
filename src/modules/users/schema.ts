import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";
import { ROLE_KEYS } from "@/lib/permissions";

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(PASSWORD_MAX_LENGTH, `Máximo ${PASSWORD_MAX_LENGTH} caracteres`);

export const roleKeySchema = z.enum(ROLE_KEYS);

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre").max(120),
  email: z.email("Correo inválido").trim().toLowerCase().max(254),
  password: passwordSchema,
  roles: z.array(roleKeySchema).min(1, "Asigna al menos un rol"),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateRolesSchema = z.object({
  roles: z.array(roleKeySchema),
});

export const setActiveSchema = z.object({
  isActive: z.boolean(),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
});
