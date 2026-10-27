import { z } from "zod";
export const attendanceInputSchema = z.object({ memberId: z.string().min(1), status: z.enum(["PRESENT", "ABSENT"]) });
export const attendanceBatchSchema = z.object({ records: z.array(attendanceInputSchema).min(1).max(1000) });
