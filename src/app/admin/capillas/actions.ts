"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { AppError } from "@/lib/errors";
import { refreshPublicSite } from "@/lib/public-cache";
import { getActor } from "@/lib/session";
import { saveChapel, saveChapelIdentity, setChapelCover, setChapelStatus } from "@/modules/chapels/service";

export async function createChapelAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    id = (await saveChapel(await getActor(), null, formToObject(form))).id;
  } catch (error) {
    return toActionState(error, form);
  }
  refreshPublicSite();
  revalidatePath("/admin/capillas");
  redirect(`/admin/capillas/${id}?creada=1`);
}

export async function updateChapelAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await saveChapel(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  refreshPublicSite();
  revalidatePath(`/admin/capillas/${id}`);
  return { ok: true, message: "Capilla actualizada." };
}

export async function setChapelStatusAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await setChapelStatus(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  refreshPublicSite();
  revalidatePath("/admin/capillas");
  revalidatePath(`/admin/capillas/${id}`);
  return { ok: true, message: "Estado de la capilla actualizado." };
}

export async function saveChapelIdentityAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await saveChapelIdentity(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  refreshPublicSite();
  revalidatePath(`/admin/capillas/${id}`);
  return { ok: true, message: "Identidad de la capilla guardada." };
}

export async function setChapelCoverAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const file = form.get("cover");
  try {
    if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION_ERROR", "Selecciona una imagen.", { cover: ["Selecciona una imagen"] });
    await setChapelCover(await getActor(), id, file);
  } catch (error) {
    return toActionState(error);
  }
  refreshPublicSite();
  revalidatePath(`/admin/capillas/${id}`);
  return { ok: true, message: "Portada actualizada." };
}

export async function removeChapelCoverAction(id: string): Promise<ActionState> {
  try {
    await setChapelCover(await getActor(), id, null);
  } catch (error) {
    return toActionState(error);
  }
  refreshPublicSite();
  revalidatePath(`/admin/capillas/${id}`);
  return { ok: true, message: "Portada quitada." };
}
