import Link from "next/link";

export function PublicHeader({ name }: { name: string }) {
  return <header className="border-b border-border bg-surface"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"><Link href="/" className="text-xl font-bold text-primary">{name}</Link><nav aria-label="Navegación pública" className="flex flex-wrap gap-1 text-sm"><Link className="rounded-lg px-3 py-2 hover:bg-background" href="/nosotros">Nosotros</Link><Link className="rounded-lg px-3 py-2 hover:bg-background" href="/horarios">Horarios</Link><Link className="rounded-lg px-3 py-2 hover:bg-background" href="/eventos">Eventos</Link><Link className="rounded-lg px-3 py-2 hover:bg-background" href="/ministerios">Ministerios</Link><Link className="rounded-lg px-3 py-2 hover:bg-background" href="/comunicados">Comunicados</Link><Link className="rounded-lg bg-primary px-3 py-2 text-primary-foreground" href="/login">Acceso</Link></nav></div></header>;
}

export function PublicFooter({ name }: { name: string }) {
  return <footer className="mt-16 border-t border-border bg-surface"><div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6"><span>{name}</span><div className="flex gap-4"><Link href="/contacto" className="hover:text-primary">Contacto</Link><Link href="/privacidad" className="hover:text-primary">Privacidad</Link></div></div></footer>;
}

export function PublicShell({ name, children }: { name: string; children: React.ReactNode }) { return <div className="flex min-h-screen flex-col"><PublicHeader name={name} /><main className="flex-1">{children}</main><PublicFooter name={name} /></div>; }

export function PublicSection({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) { return <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6"><div className="mb-8">{eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p> : null}<h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2></div>{children}</section>; }
