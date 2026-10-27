import { apiRoute, readJson } from "@/lib/api";
import { getEventAttendance, recordAttendance, recordAttendanceBatch } from "@/modules/attendance/service";
export const GET = apiRoute<{ id: string }>(async ({ actor, params }) => getEventAttendance(actor, params.id));
export const PUT = apiRoute<{ id: string }>(async ({ request, actor, params }) => { const body = await readJson(request); return typeof body === "object" && body !== null && "records" in body ? recordAttendanceBatch(actor, params.id, body) : recordAttendance(actor, params.id, body); });
