import { db } from "@/lib/db";

/*
 * Alta por cuenta propia (Google). Solo corre cuando Better Auth crea un usuario nuevo: las cuentas
 * del personal las crea un administrador directamente en la base y no pasan por aquí.
 * - Recibe el rol Miembro (portal personal); nunca acceso al panel.
 * - Si existe una ficha de miembro con el mismo correo (único por ficha) y sin cuenta, se vincula
 *   sola; si no, queda pendiente para que secretaría la vincule.
 */
export async function onSelfSignup(user: { id: string; email: string }) {
  await db.$transaction(async (tx) => {
    const hasRoles = await tx.userRole.count({ where: { userId: user.id } });
    if (!hasRoles) {
      const member = await tx.role.findUnique({ where: { key: "MEMBER" }, select: { id: true } });
      if (member) await tx.userRole.create({ data: { userId: user.id, roleId: member.id } });
    }

    const match = await tx.member.findFirst({
      where: { email: { equals: user.email, mode: "insensitive" }, user: null },
      select: { id: true },
    });
    const linked = match?.id ?? null;
    if (linked) await tx.user.update({ where: { id: user.id }, data: { memberId: linked } });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "user.self_signup",
        entityType: "User",
        entityId: user.id,
        metadata: { provider: "google", linkedMember: !!linked },
      },
    });
  });
}
