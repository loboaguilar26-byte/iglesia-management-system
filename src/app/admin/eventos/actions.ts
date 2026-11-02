"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { refreshPublicSite } from "@/lib/public-cache";
import { getActor } from "@/lib/session";
import { cancelEvent, createEvent, updateEvent } from "@/modules/events/service";
import { sendEventReminder } from "@/modules/notifications/service";

function eventInput(form: FormData) {
  return { ...formToObject(form), responsibles: form.getAll("responsibles") };
}

export async function createEventAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    id = (await createEvent(await getActor(), eventInput(form))).id;
  } catch (error) {
    return toActionState(error, form);
  }
  refreshPublicSite();
  revalidatePath("/admin/eventos");
  redirect(`/admin/eventos/${id}?guardado=1`);
}

export async function updateEventAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateEvent(await getActor(), id, eventInput(form));
  } catch (error) {
    return toActionState(error, form);
  }
  refreshPublicSite();
  revalidatePath(`/admin/eventos/${id}`);
  return { ok: true, message: "Evento actualizado." };
}

export async function cancelEventAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await cancelEvent(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }

  refreshPublicSite();
  revalidatePath(`/admin/eventos/${id}`);
  return { ok: true, message: "Evento cancelado." };
}

export async function sendEventReminderAction(id: string, _prev: ActionState): Promise<ActionState> {
  try {
    const sent = await sendEventReminder(await getActor(), id);
    revalidatePath(`/admin/eventos/${id}`);
    return { ok: true, message: `Recordatorio enviado a ${sent.length} responsable(s).` };
  } catch (error) {
    return toActionState(error);
  }
}
