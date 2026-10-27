"use server";

import { revalidatePath } from "next/cache";
import { toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { deleteSchedule, saveSchedule, updateSettings } from "@/modules/settings/service";

const value = (form: FormData, name: string) => {
  const item = form.get(name);
  return typeof item === "string" ? item : "";
};

function settingsInput(form: FormData) {
  const names = ["name", "tagline", "welcomeText", "firstVisitText", "aboutText", "mission", "vision", "valuesText", "scheduleText", "address", "phone", "whatsapp", "email", "mapUrl", "facebookUrl", "instagramUrl", "youtubeUrl", "privacyNotice", "timezone", "currency"];
  return Object.fromEntries(names.map((name) => [name, value(form, name)]));
}

export async function updateSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try { await updateSettings(await getActor(), settingsInput(form)); }
  catch (error) { return toActionState(error); }
  revalidatePath("/");
  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Configuración guardada." };
}

function scheduleInput(form: FormData) {
  return { name: value(form, "name"), dayOfWeek: value(form, "dayOfWeek"), startTime: value(form, "startTime"), endTime: value(form, "endTime"), location: value(form, "location"), description: value(form, "description"), isPublic: form.get("isPublic") === "on", sortOrder: value(form, "sortOrder") || "0" };
}

export async function saveScheduleAction(id: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  try { await saveSchedule(await getActor(), id, scheduleInput(form)); }
  catch (error) { return toActionState(error); }
  revalidatePath("/");
  revalidatePath("/admin/configuracion");
  return { ok: true, message: id ? "Horario actualizado." : "Horario agregado." };
}

export async function deleteScheduleAction(id: string, _prev: ActionState): Promise<ActionState> {
  try { await deleteSchedule(await getActor(), id); }
  catch (error) { return toActionState(error); }
  revalidatePath("/");
  revalidatePath("/admin/configuracion");
  return { ok: true, message: "Horario eliminado." };
}
