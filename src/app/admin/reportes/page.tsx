import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/layout";
import { formatDateTime, toDateInput, zonedParts } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { requirePageActor } from "@/lib/session";
import { MEMBER_STATUSES, MEMBER_STATUS_LABEL } from "@/modules/members/schema";
import { REPORT_TYPES, availableReports, buildReport, eventOptionsForReport, type Report, type ReportType } from "@/modules/reports/service";
import { getChurchTimezone } from "@/modules/settings/service";

export const metadata: Metadata = { title: "Reportes" };

const input = "min-h-10 rounded-lg border border-border bg-surface px-3";
const pad = (n: number) => String(n).padStart(2, "0");

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reportes">) {
  const actor = await requirePageActor();
  const available = availableReports(actor);
  if (!available.length) notFound();
  const sp = Object.fromEntries(Object.entries(await searchParams).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const type = (sp.tipo && sp.tipo in REPORT_TYPES && available.some(([k]) => k === sp.tipo) ? sp.tipo : available[0][0]) as ReportType;
  const tz = await getChurchTimezone();
  const now = zonedParts(new Date(), tz);
  const desde = sp.desde ?? `${now.year}-${pad(now.month)}-01`;
  const hasta = sp.hasta ?? toDateInput(new Date(), tz);
  const filters: Record<string, string> = { desde, hasta, ...(sp.estado ? { estado: sp.estado } : {}), ...(sp.evento ? { evento: sp.evento } : {}), ...(sp.agrupar ? { agrupar: sp.agrupar } : {}) };
  const events = type === "asistencia-evento" ? await eventOptionsForReport(actor) : [];
  if (type === "asistencia-evento" && !filters.evento && events[0]) filters.evento = events[0].id;

  let report: Report | null = null;
  let error: string | null = null;
  try {
    report = await buildReport(actor, type, filters);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
    error = e.message;
  }
  const qs = new URLSearchParams(filters).toString();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reportes" description="Los reportes y sus exportaciones respetan los mismos permisos que las pantallas. Las exportaciones quedan registradas." />
      <nav aria-label="Tipo de reporte" className="flex flex-wrap gap-2">
        {available.map(([k, r]) => (
          <Link key={k} href={`/admin/reportes?tipo=${k}`} aria-current={k === type ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm ${k === type ? "bg-primary text-primary-foreground" : "border border-border bg-surface hover:bg-surface-2"}`}>
            {r.label}
          </Link>
        ))}
      </nav>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <input type="hidden" name="tipo" value={type} />
        {type === "miembros" ? (
          <label className="flex flex-col gap-1 text-sm">Estado
            <select name="estado" defaultValue={sp.estado ?? ""} className={input}>
              <option value="">Todos</option>
              {MEMBER_STATUSES.map((s) => <option key={s} value={s}>{MEMBER_STATUS_LABEL[s]}</option>)}
            </select>
          </label>
        ) : type === "asistencia-evento" ? (
          <label className="flex flex-col gap-1 text-sm">Evento
            <select name="evento" defaultValue={filters.evento} className={`${input} max-w-sm`}>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title} · {formatDateTime(e.startsAt, tz)}</option>)}
            </select>
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm">Desde<input type="date" name="desde" defaultValue={desde} className={input} /></label>
            <label className="flex flex-col gap-1 text-sm">Hasta<input type="date" name="hasta" defaultValue={hasta} className={input} /></label>
            {type === "asistencia-periodo" ? (
              <label className="flex flex-col gap-1 text-sm">Agrupar por
                <select name="agrupar" defaultValue={sp.agrupar ?? "semana"} className={input}>
                  <option value="semana">Semana</option>
                  <option value="mes">Mes</option>
                </select>
              </label>
            ) : null}
          </>
        )}
        <button type="submit" className={buttonClass("secondary")}>Generar</button>
        {report ? (
          <span className="ml-auto flex gap-2">
            <a href={`/api/v1/reports/${type}?format=pdf&${qs}`} className={buttonClass("primary")}>Descargar PDF</a>
            <a href={`/api/v1/reports/${type}?format=xlsx&${qs}`} className={buttonClass("accent")}>Descargar Excel</a>
          </span>
        ) : null}
      </form>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {report ? (
        <Card>
          <header className="mb-4 border-b border-border pb-4">
            <p className="text-sm text-muted">{report.church}</p>
            <h2 className="font-display text-2xl font-semibold">{report.title}</h2>
            <p className="mt-1 text-sm text-muted">
              {report.period ? <>Periodo: {report.period} · </> : null}
              {report.filters.join(" · ")}{report.filters.length ? " · " : ""}Generado {report.generatedAt} por {report.generatedBy}
            </p>
          </header>
          {report.rows.length === 0 ? (
            <EmptyState title="Sin registros para estos filtros" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
                  <tr>{report.columns.map((c) => <th key={c.key} scope="col" className={`px-3 py-2 font-medium ${c.align === "right" ? "text-right" : ""}`}>{c.label}</th>)}</tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      {report!.columns.map((c) => <td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>{r[c.key]}</td>)}
                    </tr>
                  ))}
                </tbody>
                {report.totals ? (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-accent-soft/60 font-semibold">
                      {report.columns.map((c) => <td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>{report!.totals![c.key] ?? ""}</td>)}
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          )}
          {report.notes?.map((n) => <p key={n} className="mt-3 text-xs text-muted">{n}</p>)}
        </Card>
      ) : null}
    </div>
  );
}
