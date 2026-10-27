"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { saveChapel, setChapelStatus } from "@/modules/chapels/service";

export async function createChapelAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    id = (await saveChapel(await getActor(), null, formToObject(form))).id;
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/admin/capillas");
  redirect(`/admin/capillas/${id}?creada=1`);
}

export async function updateChapelAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await saveChapel(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath(`/admin/capillas/${id}`);
  return { ok: true, message: "Capilla actualizada." };
}

export async function setChapelStatusAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await setChapelStatus(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/admin/capillas");
  revalidatePath(`/admin/capillas/${id}`);
  return { ok: true, message: "Estado de la capilla actualizado." };
}
