"use server";

import { revalidatePath } from "next/cache";
import { toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { saveAttendance } from "@/modules/attendance/service";

export async function saveAttendanceAction(eventId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const entries = form.getAll("memberId").map((id) => ({ memberId: String(id), status: String(form.get(`att_${id}`) ?? "") }));
    const r = await saveAttendance(await getActor(), eventId, { visitorCount: form.get("visitorCount") ?? 0, entries });
    revalidatePath(`/admin/asistencia/${eventId}`);
    return { ok: true, message: `Asistencia guardada (${r.created} nuevas marcas${r.changed ? `, ${r.changed} correcciones` : ""}).` };
  } catch (error) {
    return toActionState(error);
  }
}
