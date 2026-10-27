import { NextResponse } from "next/server";
import { toErrorBody } from "@/lib/errors";
import { getActorFromHeaders } from "@/lib/session";
import { toPdf, toXlsx } from "@/modules/reports/export";
import { auditExport, buildReport } from "@/modules/reports/service";

/**
 * Exporta un reporte: ?format=pdf|xlsx|json y los mismos filtros que la pantalla.
 * Aplica exactamente los mismos permisos que la vista y queda en la bitácora.
 */
export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const actor = await getActorFromHeaders(request.headers);
    const { type } = await params;
    const query = Object.fromEntries(new URL(request.url).searchParams);
    const { format = "json", ...filters } = query;
    const report = await buildReport(actor, type, filters);
    if (format === "json") return NextResponse.json({ data: report });
    if (format !== "pdf" && format !== "xlsx") return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Formato no soportado." } }, { status: 422 });
    await auditExport(actor!, type, format, filters);
    const body = format === "pdf" ? await toPdf(report) : await toXlsx(report);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(body.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="reporte-${type}-${stamp}.${format}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const { status, body } = toErrorBody(error);
    return NextResponse.json(body, { status });
  }
}
