"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { saveMinistry, setMinistryActive } from "@/modules/ministries/service";

const value = (form: FormData, name: string) => { const item = form.get(name); return typeof item === "string" ? item : ""; };

export async function saveMinistryAction(id: string | null, _prev: ActionState, form: FormData): Promise<ActionState> {
  let savedId = id;
  try { savedId = (await saveMinistry(await getActor(), id, { name: value(form, "name"), description: value(form, "description"), isPublic: form.get("isPublic") === "on" })).id; }
  catch (error) { return toActionState(error); }
  revalidatePath("/admin/ministerios"); revalidatePath(`/admin/ministerios/${savedId}`); revalidatePath("/ministerios"); revalidatePath("/");
  if (!id) redirect(`/admin/ministerios/${savedId}`);
  return { ok: true, message: "Ministerio actualizado." };
}

export async function setMinistryActiveAction(id: string, isActive: boolean, _prev: ActionState): Promise<ActionState> {
  try { await setMinistryActive(await getActor(), id, isActive); }
  catch (error) { return toActionState(error); }
  revalidatePath("/admin/ministerios"); revalidatePath(`/admin/ministerios/${id}`); revalidatePath("/ministerios"); revalidatePath("/");
  return { ok: true, message: isActive ? "Ministerio activado." : "Ministerio desactivado." };
}
