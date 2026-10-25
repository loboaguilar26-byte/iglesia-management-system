"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { addMembership, endMembership, saveMinistry, setMinistryActive } from "@/modules/ministries/service";

export async function createMinistryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let id: string;
  try {
    id = (await saveMinistry(await getActor(), null, formToObject(form))).id;
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/admin/ministerios");
  redirect(`/admin/ministerios/${id}`);
}

export async function updateMinistryAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await saveMinistry(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath(`/admin/ministerios/${id}`);
  return { ok: true, message: "Ministerio actualizado." };
}

export async function setMinistryActiveAction(id: string, isActive: boolean, _prev: ActionState): Promise<ActionState> {
  try {
    await setMinistryActive(await getActor(), id, isActive);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath(`/admin/ministerios/${id}`);
  return { ok: true };
}

export async function addMembershipAction(ministryId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await addMembership(await getActor(), ministryId, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath(`/admin/ministerios/${ministryId}`);
  return { ok: true, message: "Integrante agregado." };
}

export async function endMembershipAction(ministryId: string, membershipId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await endMembership(await getActor(), membershipId, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath(`/admin/ministerios/${ministryId}`);
  return { ok: true, message: "Participación finalizada." };
}
