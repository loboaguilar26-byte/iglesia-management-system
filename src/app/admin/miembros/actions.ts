"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import type { MemberStatus } from "@/generated/prisma/client";
import { createMember, setMemberStatus, updateMember } from "@/modules/members/service";
import { createPortalAccount } from "@/modules/users/service";

export async function createPortalAccountAction(memberId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await createPortalAccount(await getActor(), memberId, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath(`/admin/miembros/${memberId}`);
  return { ok: true, message: "Acceso al portal creado. Comparte la contraseña inicial por un medio seguro." };
}

export async function createMemberAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    id = (await createMember(await getActor(), formToObject(form))).id;
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/admin/miembros");
  redirect(`/admin/miembros/${id}?guardado=1`);
}

export async function updateMemberAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateMember(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath(`/admin/miembros/${id}`);
  return { ok: true, message: "Cambios guardados." };
}

export async function setMemberStatusAction(id: string, status: MemberStatus, _prev: ActionState): Promise<ActionState> {
  try {
    await setMemberStatus(await getActor(), id, status);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(`/admin/miembros/${id}`);
  return { ok: true };
}
