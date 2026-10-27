import { apiRoute, readJson } from "@/lib/api";
import { parseInput } from "@/lib/validation";
import { attendanceBatchSchema, attendanceInputSchema } from "@/modules/attendance/schema";
import { getAttendanceSheet, saveAttendance } from "@/modules/attendance/service";

/** Hoja de asistencia del evento (personas y su estado; sin registro = pendiente). */
export const GET = apiRoute<{ id: string }>(async ({ actor, params }) => getAttendanceSheet(actor, params.id));

/** Registra una marca `{ memberId, status }` o varias `{ records: [...] }`. */
export const PUT = apiRoute<{ id: string }>(async ({ request, actor, params }) => {
  const body = await readJson(request);
  const records =
    typeof body === "object" && body !== null && "records" in body
      ? parseInput(attendanceBatchSchema, body).records
      : [parseInput(attendanceInputSchema, body)];
  return saveAttendance(actor, params.id, { entries: records });
});
