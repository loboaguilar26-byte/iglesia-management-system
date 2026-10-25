"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formToObject, toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { addCatalogItem, correctDonation, createDonation, toggleCatalogItem, voidDonation } from "@/modules/finance/service";

export async function createDonationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await createDonation(await getActor(), formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/admin/tesoreria");
  return { ok: true, message: "Aportación registrada." };
}

export async function voidDonationAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await voidDonation(await getActor(), id, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath(`/admin/tesoreria/${id}`);
  return { ok: true, message: "Aportación anulada." };
}

export async function correctDonationAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  let newId: string;
  try {
    newId = (await correctDonation(await getActor(), id, formToObject(form))).id;
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/admin/tesoreria");
  redirect(`/admin/tesoreria/${newId}`);
}

export async function addCatalogAction(kind: "concept" | "method", _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await addCatalogItem(await getActor(), kind, formToObject(form));
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath("/admin/tesoreria/catalogos");
  return { ok: true, message: "Agregado." };
}

export async function toggleCatalogAction(kind: "concept" | "method", id: string, isActive: boolean, _prev: ActionState): Promise<ActionState> {
  try {
    await toggleCatalogItem(await getActor(), kind, id, isActive);
  } catch (error) {
    return toActionState(error);
  }
  revalidatePath("/admin/tesoreria/catalogos");
  return { ok: true };
}
