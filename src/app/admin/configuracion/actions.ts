"use server";

import { revalidatePath } from "next/cache";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { refreshPublicSite } from "@/lib/public-cache";
import { getActor } from "@/lib/session";
import { deleteSchedule, removeLogo, saveSchedule, updateLogo, updateSettings } from "@/modules/settings/service";

function done(message: string): ActionState {
  refreshPublicSite();
  revalidatePath("/admin/configuracion");
  return { ok: true, message };
}

export async function updateSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateSettings(await getActor(), formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  return done("Configuración guardada.");
}

export async function updateLogoAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateLogo(await getActor(), form.get("logo"));
  } catch (error) {
    return toActionState(error);
  }
  return done("Logotipo actualizado.");
}

export async function removeLogoAction(_prev: ActionState): Promise<ActionState> {
  try {
    await removeLogo(await getActor());
  } catch (error) {
    return toActionState(error);
  }
  return done("Logotipo eliminado.");
}

export async function saveScheduleAction(id: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await saveSchedule(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  return done(id ? "Horario actualizado." : "Horario agregado.");
}

export async function deleteScheduleAction(id: string, _prev: ActionState): Promise<ActionState> {
  try {
    await deleteSchedule(await getActor(), id);
  } catch (error) {
    return toActionState(error);
  }
  return done("Horario eliminado.");
}
