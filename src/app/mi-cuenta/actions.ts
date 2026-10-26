"use server";

import { revalidatePath } from "next/cache";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { submitGivingReport } from "@/modules/finance/service";
import { updateMyContact } from "@/modules/portal/service";

export async function updateMyContactAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateMyContact(await getActor(), formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/mi-cuenta");
  return { ok: true, message: "Tus datos se actualizaron." };
}

export async function submitGivingReportAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await submitGivingReport(await getActor(), formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/mi-cuenta");
  revalidatePath("/admin/tesoreria/ofrendas");
  return { ok: true, message: "Tu reporte quedó pendiente de validación por tesorería." };
}
