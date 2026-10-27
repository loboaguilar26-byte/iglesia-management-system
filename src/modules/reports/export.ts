import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { Report } from "./service";

/** Excel (.xlsx) con encabezado: iglesia, título, periodo, filtros, fecha de generación. */
export async function toXlsx(report: Report): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = report.church;
  const ws = wb.addWorksheet(report.title.slice(0, 31));
  const header = [report.church, report.title, report.period ? `Periodo: ${report.period}` : null, ...report.filters, `Generado: ${report.generatedAt} por ${report.generatedBy}`].filter(Boolean) as string[];
  header.forEach((line, i) => {
    const row = ws.addRow([line]);
    row.font = i === 0 ? { bold: true, size: 14 } : i === 1 ? { bold: true, size: 12 } : { size: 10, color: { argb: "FF555555" } };
  });
  ws.addRow([]);
  const head = ws.addRow(report.columns.map((c) => c.label));
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A2B18" } };
  });
  for (const r of report.rows) ws.addRow(report.columns.map((c) => r[c.key] ?? ""));
  if (report.totals) {
    const t = ws.addRow(report.columns.map((c) => report.totals![c.key] ?? ""));
    t.font = { bold: true };
  }
  for (const note of report.notes ?? []) ws.addRow([note]).font = { italic: true, size: 9 };
  report.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.min(45, Math.max(c.label.length + 2, ...report.rows.map((r) => String(r[c.key] ?? "").length + 2), 12));
    if (c.align === "right") col.alignment = { horizontal: "right" };
  });
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/** PDF tabular con las mismas cabeceras y totales que la pantalla. */
export function toPdf(report: Report): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const landscape = report.columns.length > 4;
    const doc = new PDFDocument({ size: "LETTER", layout: landscape ? "landscape" : "portrait", margin: 40, info: { Title: report.title, Author: report.church } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    doc.fillColor("#10253d").font("Helvetica-Bold").fontSize(16).text(report.church);
    doc.fillColor("#000").fontSize(13).text(report.title);
    doc.font("Helvetica").fontSize(9).fillColor("#555");
    if (report.period) doc.text(`Periodo: ${report.period}`);
    for (const f of report.filters) doc.text(f);
    doc.text(`Generado: ${report.generatedAt} por ${report.generatedBy}`);
    doc.moveDown(0.8);

    const colW = width / report.columns.length;
    const drawRow = (values: string[], opts: { bold?: boolean; fill?: string; color?: string } = {}) => {
      doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      const heights = values.map((v) => doc.heightOfString(v, { width: colW - 8 }));
      const h = Math.max(...heights) + 8;
      if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
      const y = doc.y;
      if (opts.fill) doc.rect(left, y, width, h).fill(opts.fill);
      values.forEach((v, i) => {
        doc.fillColor(opts.color ?? "#111").text(v, left + i * colW + 4, y + 4, { width: colW - 8, align: report.columns[i].align === "right" ? "right" : "left" });
      });
      doc.moveTo(left, y + h).lineTo(left + width, y + h).strokeColor("#dddddd").lineWidth(0.5).stroke();
      doc.x = left;
      doc.y = y + h;
    };
    drawRow(report.columns.map((c) => c.label), { bold: true, fill: "#10253d", color: "#ffffff" });
    report.rows.forEach((r, i) => drawRow(report.columns.map((c) => String(r[c.key] ?? "")), { fill: i % 2 ? "#f8f3ec" : undefined }));
    if (report.totals) drawRow(report.columns.map((c) => String(report.totals![c.key] ?? "")), { bold: true, fill: "#f4e5cc" });
    if (!report.rows.length) doc.moveDown().font("Helvetica-Oblique").text("Sin registros en el periodo.");
    doc.moveDown();
    doc.font("Helvetica-Oblique").fontSize(8).fillColor("#555");
    for (const n of report.notes ?? []) doc.text(n, left, doc.y, { width });
    doc.end();
  });
}
