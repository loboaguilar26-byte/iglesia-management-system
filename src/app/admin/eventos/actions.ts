"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { cancelEvent, createEvent, updateEvent } from "@/modules/events/service";
import { recordAttendanceBatch } from "@/modules/attendance/service";
const val = (f: FormData, n: string) => { const x = f.get(n); return typeof x === "string" ? x : undefined; };
const input = (f: FormData) => ({ title: val(f, "title"), typeId: val(f, "typeId"), startsAt: val(f, "startsAt"), endsAt: val(f, "endsAt"), location: val(f, "location"), description: val(f, "description"), visibility: val(f, "visibility"), visitorCount: val(f, "visitorCount") });
export async function createEventAction(_p: ActionState, f: FormData): Promise<ActionState> { let id: string; try { id = (await createEvent(await getActor(), input(f))).id; } catch (e) { return toActionState(e); } revalidatePath("/admin/eventos"); redirect(`/admin/eventos/${id}?creado=1`); }
export async function updateEventAction(id: string, _p: ActionState, f: FormData): Promise<ActionState> { try { await updateEvent(await getActor(), id, input(f)); } catch (e) { return toActionState(e); } revalidatePath("/admin/eventos"); revalidatePath(`/admin/eventos/${id}`); return { ok: true, message: "Evento actualizado." }; }
export async function cancelEventAction(id: string, _p: ActionState, f: FormData): Promise<ActionState> { try { await cancelEvent(await getActor(), id, { reason: val(f, "reason") }); } catch (e) { return toActionState(e); } revalidatePath("/admin/eventos"); revalidatePath(`/admin/eventos/${id}`); return { ok: true, message: "Evento cancelado." }; }
export async function recordAttendanceAction(id: string, _p: ActionState, f: FormData): Promise<ActionState> { try { const raw = val(f, "records"); const records = JSON.parse(raw ?? "[]") as Array<{ memberId: string; status: string }>; for (const record of records) { const value = val(f, `status-${record.memberId}`); if (value === "PRESENT" || value === "ABSENT") record.status = value; } await recordAttendanceBatch(await getActor(), id, { records }); } catch (e) { return toActionState(e); } revalidatePath(`/admin/eventos/${id}`); return { ok: true, message: "Asistencia guardada." }; }
