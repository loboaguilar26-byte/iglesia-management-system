"use server";

import { revalidatePath } from "next/cache";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import {
  updateAnonymousConfessionMessage,
  updateConfessionAppointment,
} from "@/modules/confessions/service";

export async function updateConfessionAppointmentAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateConfessionAppointment(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/admin/confesiones");
  return { ok: true, message: "Estado de la cita actualizado." };
}

export async function updateAnonymousConfessionMessageAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateAnonymousConfessionMessage(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/admin/confesiones");
  return { ok: true, message: "Respuesta sacerdotal guardada." };
}
