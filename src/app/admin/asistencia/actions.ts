"use server";

import { revalidatePath } from "next/cache";
import { toActionState, type ActionState } from "@/lib/action-state";
import { getActor } from "@/lib/session";
import { saveAttendance } from "@/modules/attendance/service";
import { createMember } from "@/modules/members/service";

/** Registra a un visitante nuevo (ficha "Visitante") y lo marca presente en el evento. */
export async function quickVisitorAction(eventId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await getActor();
    const member = await createMember(actor, {
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      phone: form.get("phone") || undefined,
      status: "VISITOR",
      confirmDuplicate: form.get("confirmDuplicate"),
    });
    await saveAttendance(actor, eventId, { entries: [{ memberId: member.id, status: "PRESENT" }] });
  } catch (error) {
    return toActionState(error, form);
  }
  revalidatePath(`/admin/asistencia/${eventId}`);
  return { ok: true, message: "Visitante registrado y marcado presente. Aparecerá en Seguimiento." };
}

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
