"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { createUser, setUserActive, updateUserRoles } from "@/modules/users/service";

export async function createUserAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    const user = await createUser(await getActor(), {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      roles: form.getAll("roles"),
    });
    id = user.id;
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/admin/usuarios");
  redirect(`/admin/usuarios/${id}?creado=1`);
}

export async function updateRolesAction(userId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateUserRoles(await getActor(), userId, { roles: form.getAll("roles") });
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(`/admin/usuarios/${userId}`);
  return { ok: true, message: "Roles actualizados." };
}

export async function setActiveAction(userId: string, isActive: boolean, _prev: ActionState): Promise<ActionState> {
  try {
    await setUserActive(await getActor(), userId, { isActive });
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(`/admin/usuarios/${userId}`);
  return { ok: true, message: isActive ? "Usuario activado." : "Usuario desactivado y sesiones cerradas." };
}
