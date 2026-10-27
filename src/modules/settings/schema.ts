import { z } from "zod";
import { isValidTimeZone } from "@/lib/dates";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/\S+$/i.test(v), "Debe ser un enlace https://")
  .transform((v) => (v === "" ? null : v))
  .optional();

export const settingsSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre de la iglesia").max(150),
  tagline: optionalText(200),
  welcomeText: optionalText(1000),
  firstVisitText: optionalText(3000),
  aboutText: optionalText(5000),
  mission: optionalText(1000),
  vision: optionalText(1000),
  valuesText: optionalText(2000),
  scheduleText: optionalText(1000),
  address: optionalText(300),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.email().safeParse(v).success, "Correo inválido")
    .transform((v) => (v === "" ? null : v.toLowerCase()))
    .optional(),
  whatsapp: optionalText(40),
  mapUrl: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  privacyNotice: optionalText(20000),
  timezone: z.string().refine(isValidTimeZone, "Zona horaria inválida"),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Código de 3 letras, p. ej. MXN"),
});

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM");

export const scheduleSchema = z
  .object({
    name: z.string().trim().min(2, "Escribe el nombre").max(100),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: time,
    endTime: z.union([time, z.literal("")]).optional().transform((v) => v || null),
    location: optionalText(150),
    description: optionalText(500),
    isPublic: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  })
  .refine((s) => !s.endTime || s.endTime > s.startTime, { message: "Debe terminar después de iniciar", path: ["endTime"] });

export const TIMEZONES = [
  "America/Mexico_City",
  "America/Monterrey",
  "America/Merida",
  "America/Cancun",
  "America/Chihuahua",
  "America/Mazatlan",
  "America/Hermosillo",
  "America/Tijuana",
  "America/Bogota",
  "America/Lima",
  "America/Guatemala",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/Madrid",
];
