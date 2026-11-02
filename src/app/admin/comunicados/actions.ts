"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { refreshPublicSite } from "@/lib/public-cache";
import { getActor } from "@/lib/session";
import type { AnnouncementStatus } from "@/generated/prisma/client";
import { createAnnouncement, deleteAnnouncement, setAnnouncementStatus, updateAnnouncement } from "@/modules/announcements/service";

export async function createAnnouncementAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await createAnnouncement(await getActor(), formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  refreshPublicSite();
  revalidatePath("/admin/comunicados");
  redirect("/admin/comunicados");
}

export async function updateAnnouncementAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await updateAnnouncement(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  refreshPublicSite();
  revalidatePath(`/admin/comunicados/${id}`);
  return { ok: true, message: "Comunicado guardado." };
}

export async function setAnnouncementStatusAction(id: string, status: AnnouncementStatus, _prev: ActionState): Promise<ActionState> {
  try {
    await setAnnouncementStatus(await getActor(), id, status);
  } catch (error) {
    return toActionState(error);
  }
  refreshPublicSite();
  revalidatePath("/admin/comunicados");
  revalidatePath(`/admin/comunicados/${id}`);
  return { ok: true };
}

export async function deleteAnnouncementAction(id: string, _prev: ActionState): Promise<ActionState> {
  try {
    await deleteAnnouncement(await getActor(), id);
  } catch (error) {
    return toActionState(error);
  }
  refreshPublicSite();
  revalidatePath("/admin/comunicados");
  redirect("/admin/comunicados");
}
