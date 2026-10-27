"use server";

import { revalidatePath } from "next/cache";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { submitGivingReport } from "@/modules/finance/service";
import { closeMyPrayerRequest, createPrayerRequest, requestToJoinMinistry, setMyRsvp, withdrawJoinRequest } from "@/modules/portal/engagement";
import { updateMyContact } from "@/modules/portal/service";

export async function updateMyContactAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateMyContact(await getActor(), formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/mi-cuenta", "layout");
  return { ok: true, message: "Tus datos se actualizaron." };
}

export async function submitGivingReportAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await submitGivingReport(await getActor(), formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/mi-cuenta", "layout");
  revalidatePath("/admin/tesoreria/ofrendas");
  return { ok: true, message: "Tu reporte quedó pendiente de validación por tesorería." };
}

export async function setRsvpAction(eventId: string, response: "GOING" | "MAYBE" | "NOT_GOING"): Promise<ActionState> {
  try {
    await setMyRsvp(await getActor(), eventId, { response });
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/mi-cuenta/agenda");
  revalidatePath("/mi-cuenta");
  return { ok: true, message: "Respuesta guardada." };
}

export async function requestToJoinAction(ministryId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requestToJoinMinistry(await getActor(), ministryId, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/mi-cuenta/ministerios");
  return { ok: true, message: "Solicitud enviada. El equipo del ministerio te responderá pronto." };
}

export async function withdrawJoinRequestAction(requestId: string): Promise<ActionState> {
  try {
    await withdrawJoinRequest(await getActor(), requestId);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/mi-cuenta/ministerios");
  return { ok: true, message: "Solicitud retirada." };
}

export async function createPrayerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await createPrayerRequest(await getActor(), formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/mi-cuenta/oracion");
  return { ok: true, message: "Tu petición fue enviada al equipo pastoral. Estaremos orando por ti." };
}

export async function closePrayerAction(id: string, answered: boolean): Promise<ActionState> {
  try {
    await closeMyPrayerRequest(await getActor(), id, answered);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/mi-cuenta/oracion");
  return { ok: true, message: answered ? "¡Gloria a Dios! Marcamos tu petición como respondida." : "Petición cerrada." };
}
