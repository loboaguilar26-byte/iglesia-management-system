"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { createAnnouncement, setAnnouncementStatus, updateAnnouncement } from "@/modules/announcements/service";

const value = (form: FormData, name: string) => { const item = form.get(name); return typeof item === "string" ? item : ""; };
function input(form: FormData) { return { title: value(form, "title"), body: value(form, "body"), visibility: value(form, "visibility"), isFeatured: form.get("isFeatured") === "on", expiresOn: value(form, "expiresOn"), publish: form.get("publish") === "on" }; }

export async function createAnnouncementAction(_prev: ActionState, form: FormData): Promise<ActionState> { let id: string; try { id = (await createAnnouncement(await getActor(), input(form))).id; } catch (error) { return toActionState(error); } revalidatePath("/"); revalidatePath("/comunicados"); revalidatePath("/admin/comunicados"); redirect(`/admin/comunicados/${id}`); }
export async function updateAnnouncementAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> { try { await updateAnnouncement(await getActor(), id, input(form)); } catch (error) { return toActionState(error); } revalidatePath("/"); revalidatePath("/comunicados"); revalidatePath(`/admin/comunicados/${id}`); return { ok: true, message: "Comunicado actualizado." }; }
export async function setAnnouncementStatusAction(id: string, status: "PUBLISHED" | "ARCHIVED", _prev: ActionState): Promise<ActionState> { try { await setAnnouncementStatus(await getActor(), id, status); } catch (error) { return toActionState(error); } revalidatePath("/"); revalidatePath("/comunicados"); revalidatePath("/admin/comunicados"); revalidatePath(`/admin/comunicados/${id}`); return { ok: true, message: status === "PUBLISHED" ? "Comunicado publicado." : "Comunicado archivado." }; }
