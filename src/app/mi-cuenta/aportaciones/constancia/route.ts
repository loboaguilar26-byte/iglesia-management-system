import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { toErrorBody } from "@/lib/errors";
import { getActorFromHeaders } from "@/lib/session";
import { myGivingStatement } from "@/modules/portal/engagement";
import { toPdf } from "@/modules/reports/export";

/** Constancia anual (PDF) de las aportaciones del propio miembro. Queda en la bitácora. */
export async function GET(request: Request) {
  try {
    const year = Number(new URL(request.url).searchParams.get("anio")) || undefined;
    const report = await myGivingStatement(await getActorFromHeaders(request.headers), year);
    const body = await toPdf(report);
    return new Response(body.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="constancia-aportaciones-${report.title.slice(-4)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    const { status, body } = toErrorBody(error);
    return NextResponse.json(body, { status });
  }
}
