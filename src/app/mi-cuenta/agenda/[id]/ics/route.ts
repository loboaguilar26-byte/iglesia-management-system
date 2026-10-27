import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { toErrorBody } from "@/lib/errors";
import { getActorFromHeaders } from "@/lib/session";
import { myEventIcs } from "@/modules/portal/engagement";

/** Descarga el evento en formato iCalendar (.ics) para el calendario del miembro. */
export async function GET(request: Request, { params }: RouteContext<"/mi-cuenta/agenda/[id]/ics">) {
  try {
    const { id } = await params;
    const ics = await myEventIcs(await getActorFromHeaders(request.headers), id);
    return new Response(ics.body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${ics.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    const { status, body } = toErrorBody(error);
    return NextResponse.json(body, { status });
  }
}
