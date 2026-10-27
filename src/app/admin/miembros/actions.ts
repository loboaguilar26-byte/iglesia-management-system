"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { createMember, setMemberActive, updateMember } from "@/modules/members/service";

function value(form: FormData, name: string) {
  const item = form.get(name);
  return typeof item === "string" ? item : undefined;
}

function input(form: FormData) {
  return {
    firstName: value(form, "firstName"),
    lastName: value(form, "lastName"),
    phone: value(form, "phone"),
    email: value(form, "email"),
    joinDate: value(form, "joinDate"),
    status: value(form, "status"),
    position: value(form, "position"),
    isMinor: form.get("isMinor") === "on",
    notes: value(form, "notes"),
  };
}

export async function createMemberAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try { id = (await createMember(await getActor(), input(form))).id; }
  catch (error) { return toActionState(error); }
  revalidatePath("/admin/miembros");
  redirect(`/admin/miembros/${id}?creado=1`);
}

export async function updateMemberAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try { await updateMember(await getActor(), id, input(form)); }
  catch (error) { return toActionState(error); }
  revalidatePath("/admin/miembros");
  revalidatePath(`/admin/miembros/${id}`);
  return { ok: true, message: "Miembro actualizado." };
}

export async function setMemberActiveAction(id: string, isActive: boolean, _prev: ActionState): Promise<ActionState> {
  try { await setMemberActive(await getActor(), id, { isActive }); }
  catch (error) { return toActionState(error); }
  revalidatePath("/admin/miembros");
  revalidatePath(`/admin/miembros/${id}`);
  return { ok: true, message: isActive ? "Miembro activado." : "Miembro desactivado." };
}
