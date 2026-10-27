import { z } from "zod";
import { normalizeSearch } from "@/lib/text";

const memberStatus = z.enum(["VISITOR", "ACTIVE", "INACTIVE"]);
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const memberInputSchema = z.object({
  firstName: z.string().trim().min(2, "Escribe el nombre").max(100),
  lastName: z.string().trim().min(2, "Escribe los apellidos").max(150),
  phone: optionalText(40),
  email: z.string().trim().email("Escribe un correo válido").max(160).optional().or(z.literal("")),
  joinDate: z.string().trim().optional().or(z.literal("")),
  status: memberStatus,
  position: optionalText(120),
  isMinor: z.coerce.boolean().default(false),
  notes: optionalText(4000),
});

export const listMembersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).default(""),
  status: memberStatus.optional(),
});

export const setMemberActiveSchema = z.object({ isActive: z.boolean() });
export type MemberInput = z.infer<typeof memberInputSchema>;

export function normalizedMemberName(firstName: string, lastName: string) {
  return normalizeSearch(`${firstName} ${lastName}`);
}
