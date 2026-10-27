import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { toErrorBody } from "@/lib/errors";
import { getActorFromHeaders } from "@/lib/session";
import { myDataExport } from "@/modules/portal/engagement";

/** Copia de los datos personales del propio miembro (derecho de acceso). */
export async function GET(request: Request) {
  try {
    const data = await myDataExport(await getActorFromHeaders(request.headers));
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mis-datos-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    const { status, body } = toErrorBody(error);
    return NextResponse.json(body, { status });
  }
}
