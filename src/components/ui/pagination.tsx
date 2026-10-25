import Link from "next/link";

export function Pagination({ page, pageSize, total, hrefFor }: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const link = "min-h-10 rounded-md border border-border px-3 py-2 text-sm hover:bg-background";
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-2">
      <p className="text-sm text-muted">
        Página {page} de {pages} · {total} registros
      </p>
      <div className="flex gap-2">
        {page > 1 ? <Link className={link} href={hrefFor(page - 1)}>Anterior</Link> : null}
        {page < pages ? <Link className={link} href={hrefFor(page + 1)}>Siguiente</Link> : null}
      </div>
    </nav>
  );
}
