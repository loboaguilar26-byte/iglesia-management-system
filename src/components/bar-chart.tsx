/**
 * Gráfica de barras accesible en SVG (sin dependencias). Incluye una tabla equivalente para
 * lectores de pantalla y etiquetas de valor visibles.
 */
export function BarChart({ data, label, format = (v) => String(v), color = "var(--primary)", stackColor = "var(--accent)" }: {
  data: { label: string; value: number; stack?: number }[];
  label: string;
  format?: (v: number) => string;
  color?: string;
  stackColor?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value + (d.stack ?? 0)));
  const w = 100 / data.length;
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="h-44 w-full" role="img" aria-label={label}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2="100" y1={50 - f * 46} y2={50 - f * 46} stroke="var(--border)" strokeWidth="0.2" vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * 46;
          const hs = ((d.stack ?? 0) / max) * 46;
          const x = i * w + w * 0.18;
          return (
            <g key={d.label}>
              <rect x={x} y={50 - h} width={w * 0.64} height={h} rx="0.8" fill={color}>
                <title>{`${d.label}: ${format(d.value)}`}</title>
              </rect>
              {hs > 0 ? (
                <rect x={x} y={50 - h - hs} width={w * 0.64} height={hs} rx="0.8" fill={stackColor}>
                  <title>{`${d.label}: ${format(d.stack!)} (secundario)`}</title>
                </rect>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="grid text-center text-[10px] text-muted" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d) => <span key={d.label} className="truncate">{d.label}</span>)}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}><th scope="row">{d.label}</th><td>{format(d.value)}</td>{d.stack !== undefined ? <td>{format(d.stack)}</td> : null}</tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
