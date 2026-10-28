import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Pantalla de acceso (iniciar sesión, recuperar y restablecer contraseña): panel celestial con el
 * logotipo de Eclaria a la izquierda en pantallas grandes y el formulario a la derecha.
 */
export function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen flex-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section aria-hidden className="auth-sky relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-12">
        <div className="auth-sky__rays" />
        <div className="relative flex flex-col items-center text-center">
          <div className="auth-sky__halo">
            <Image src="/eclaria-logo.jpg" alt="" width={360} height={360} priority className="auth-sky__logo" />
          </div>
          <p className="mt-8 max-w-sm text-lg text-white/80">Una sola plataforma para tu iglesia, tus capillas y tu comunidad.</p>
        </div>
      </section>

      <section className="relative flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="page-enter w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <Image src="/eclaria-icon.png" alt="Eclaria" width={72} height={72} priority className="size-16 rounded-2xl shadow-lg ring-1 ring-accent/40 lg:hidden" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent lg:mt-0">Eclaria</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{title}</h1>
            {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg shadow-black/5 sm:p-7">{children}</div>
          <Link href="/" className="mt-6 block text-center text-sm text-muted hover:text-primary">← Volver al sitio</Link>
        </div>
      </section>
    </main>
  );
}
