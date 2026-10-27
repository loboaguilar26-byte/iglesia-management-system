"use server";

import { revalidatePath } from "next/cache";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { updatePrayerRequest } from "@/modules/portal/engagement";

export async function updatePrayerAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updatePrayerRequest(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/admin/oracion");
  revalidatePath("/mi-cuenta/oracion");
  return { ok: true, message: "Petición actualizada." };
}
