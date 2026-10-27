"use server";

import { revalidatePath } from "next/cache";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { addFollowUp } from "@/modules/followups/service";

export async function addFollowUpAction(memberId: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  const target = memberId ?? String(form.get("memberId") ?? "");
  try {
    if (!target) return { ok: false, message: "Selecciona a la persona.", fieldErrors: { memberId: ["Requerido"] } };
    await addFollowUp(await getActor(), target, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/admin/seguimiento");
  revalidatePath(`/admin/miembros/${target}`);
  return { ok: true, message: "Contacto registrado." };
}
