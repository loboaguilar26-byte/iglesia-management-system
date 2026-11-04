import { db } from "@/lib/db";

/*
 * Alta por cuenta propia (/registro o Google). Solo corre cuando Better Auth crea un usuario nuevo:
 * las cuentas del personal las crea un administrador directamente en la base y no pasan por aquí.
 * - Recibe el rol Miembro (portal personal); nunca acceso al panel.
 * - Con Google (correo verificado), si existe una ficha de miembro con el mismo correo y sin cuenta,
 *   se vincula sola. Con correo y contraseña nadie comprobó que el correo sea suyo: no se vincula,
 *   para que nadie llegue a los datos de otra persona escribiendo su correo. Lo hace secretaría.
 */
export async function onSelfSignup(user: { id: string; email: string; emailVerified: boolean }) {
  await db.$transaction(async (tx) => {
    const hasRoles = await tx.userRole.count({ where: { userId: user.id } });
    if (!hasRoles) {
      const member = await tx.role.findUnique({ where: { key: "MEMBER" }, select: { id: true } });
      if (member) await tx.userRole.create({ data: { userId: user.id, roleId: member.id } });
    }

    const match = user.emailVerified
      ? await tx.member.findFirst({
          where: { email: { equals: user.email, mode: "insensitive" }, user: null },
          select: { id: true },
        })
      : null;
    const linked = match?.id ?? null;
    if (linked) await tx.user.update({ where: { id: user.id }, data: { memberId: linked } });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "user.self_signup",
        entityType: "User",
        entityId: user.id,
        metadata: { provider: user.emailVerified ? "google" : "email", linkedMember: !!linked },
      },
    });
  });
}

/**
 * Google es la prueba de que el correo es de quien entra. Si alguien se registró antes con ese correo
 * y una contraseña, no se pudo comprobar que fuera suyo: al vincular Google se anulan esa contraseña y
 * sus sesiones, para que quien lo haya registrado no conserve acceso a la cuenta del dueño real.
 * Las cuentas creadas por un administrador no se tocan: no tienen este registro de alta.
 */
export async function onAccountLinked(account: { userId: string; providerId: string }) {
  if (account.providerId !== "google") return;
  const signedUpWithEmail = await db.auditLog.findFirst({
    where: { action: "user.self_signup", entityId: account.userId, metadata: { path: ["provider"], equals: "email" } },
    select: { id: true },
  });
  if (!signedUpWithEmail) return;
  const user = await db.user.findUnique({ where: { id: account.userId }, select: { emailVerified: true } });
  if (user?.emailVerified) return;
  await db.$transaction([
    db.account.deleteMany({ where: { userId: account.userId, providerId: "credential" } }),
    db.session.deleteMany({ where: { userId: account.userId } }),
    db.auditLog.create({
      data: { actorId: account.userId, action: "user.email_claimed_with_google", entityType: "User", entityId: account.userId },
    }),
  ]);
}
