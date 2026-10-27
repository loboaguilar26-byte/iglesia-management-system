"use server";

import { revalidatePath } from "next/cache";
import { toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { createChurch, updateChurch } from "@/modules/churches/service";

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function createChurchAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await createChurch(await getActor(), {
      franchiseId: text(form, "franchiseId"),
      franchiseName: text(form, "franchiseName"),
      name: text(form, "name"),
      slug: text(form, "slug"),
      code: text(form, "code"),
      primaryColor: text(form, "primaryColor"),
      accentColor: text(form, "accentColor"),
    });
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/admin/iglesias");
  return { ok: true, message: "Iglesia agregada correctamente a la franquicia." };
}

export async function updateChurchAction(churchId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateChurch(await getActor(), churchId, {
      name: text(form, "name"),
      code: text(form, "code"),
      primaryColor: text(form, "primaryColor"),
      accentColor: text(form, "accentColor"),
      fontFamily: text(form, "fontFamily"),
      address: text(form, "address"),
      phone: text(form, "phone"),
      email: text(form, "email") ?? "",
      timezone: text(form, "timezone"),
      currency: text(form, "currency"),
      aboutText: text(form, "aboutText"),
      scheduleText: text(form, "scheduleText"),
    });
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(`/admin/iglesias/${churchId}`);
  revalidatePath("/admin/iglesias");
  return { ok: true, message: "Configuración de la iglesia actualizada." };
}
