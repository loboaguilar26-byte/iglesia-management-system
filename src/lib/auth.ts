import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./auth-rules";
import { db } from "./db";
import { sendMail } from "./mailer";

function listFromEnv(value: string | undefined) {
  const items = value?.split(",").map((s) => s.trim()).filter(Boolean);
  return items?.length ? items : undefined;
}

export const auth = betterAuth({
  appName: "Gestión de Iglesia",
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // No hay registro público: los usuarios los crea un administrador.
    disableSignUp: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    resetPasswordTokenExpiresIn: 60 * 30,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Restablecer contraseña",
        text: `Hola ${user.name}:\n\nPara restablecer tu contraseña abre este enlace (vence en 30 minutos):\n${url}\n\nSi no lo solicitaste, ignora este mensaje.`,
      });
    },
  },
  user: {
    additionalFields: {
      isActive: { type: "boolean", defaultValue: true, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: process.env.NODE_ENV !== "test",
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
    },
  },
  advanced: {
    // Sin esta configuración no se confía en encabezados de proxy y el límite de intentos
    // se comparte entre todos los clientes. Ver docs/seguridad.md y docs/despliegue.md.
    ipAddress: {
      ipAddressHeaders: listFromEnv(process.env.AUTH_IP_HEADERS),
      trustedProxies: listFromEnv(process.env.AUTH_TRUSTED_PROXIES),
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Un usuario desactivado no puede iniciar sesión.
        before: async (session) => {
          const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { isActive: true },
          });
          if (!user?.isActive) {
            throw new APIError("FORBIDDEN", { message: "Usuario inactivo" });
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});
