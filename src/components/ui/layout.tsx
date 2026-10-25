import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, description, actions, back }: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-3">
      {back ? (
        <Link href={back.href} className="w-fit text-sm text-primary hover:underline">
          ← {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Card({ title, description, children, className = "", actions }: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6 ${className}`}>
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2 px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, detail, icon }: { label: string; value: ReactNode; detail?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon ? <span className="rounded-lg bg-accent-soft p-2 text-accent">{icon}</span> : null}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </div>
  );
}

type Tone = "neutral" | "success" | "danger" | "warning" | "info" | "accent";
const tones: Record<Tone, string> = {
  neutral: "bg-muted/15 text-muted",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  warning: "bg-warning/15 text-warning",
  info: "bg-primary/12 text-primary",
  accent: "bg-accent-soft text-accent",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

/** Tabla en escritorio y tarjetas en móvil (sin desplazamiento horizontal). */
export function ResponsiveTable<T>({ rows, columns, rowKey, caption }: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  caption?: string;
}) {
  const [first, ...rest] = columns;
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface shadow-sm md:block">
        <table className="w-full text-left text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.header} scope="col" className={`px-4 py-3 font-medium ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-t border-border align-top hover:bg-surface-2/60">
                {columns.map((c) => (
                  <td key={c.header} className={`px-4 py-3 ${c.className ?? ""}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="font-medium">{first.cell(row)}</div>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {rest.map((c) => (
                <div key={c.header} className="contents">
                  <dt className="text-muted">{c.header}</dt>
                  <dd className="min-w-0 break-words">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
