"use server";

import { headers } from "next/headers";
import { toActionState, type ActionState, formToObject } from "@/lib/action-state";
import { clientIp } from "@/lib/session";
import { throttle } from "@/lib/throttle";
import { requestConfessionAppointment, submitAnonymousConfessionMessage } from "@/modules/confessions/service";

const TEN_MINUTES = 10 * 60 * 1000;

export async function requestConfessionAppointmentAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    throttle("confession-appointment", clientIp(await headers()), { max: 5, windowMs: TEN_MINUTES });
    await requestConfessionAppointment(formToObject(form));
  } catch (error) {
    return toActionState(error);
  }
  return { ok: true, message: "Solicitud recibida. La cita queda pendiente de confirmación por el sacerdote." };
}

export async function submitAnonymousConfessionMessageAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    throttle("confession-message", clientIp(await headers()), { max: 3, windowMs: TEN_MINUTES });
    await submitAnonymousConfessionMessage(formToObject(form));
  } catch (error) {
    return toActionState(error);
  }
  return { ok: true, message: "Tu mensaje anónimo fue recibido de forma confidencial." };
}
