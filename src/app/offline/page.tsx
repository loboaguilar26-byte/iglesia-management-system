import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sin conexión", robots: { index: false } };

/** Página que muestra la app instalada cuando no hay internet (se guarda en caché al instalar). */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <span aria-hidden className="flex size-16 items-center justify-center rounded-2xl bg-brand font-display text-3xl text-accent">!</span>
      <h1 className="font-display text-3xl font-semibold">Sin conexión</h1>
      <p className="max-w-sm text-muted">No hay conexión a internet. Revisa tu red y vuelve a intentarlo; la información se actualiza en cuanto te conectes.</p>
      {/* Recarga completa a propósito: la navegación del cliente no funciona sin red. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground">Reintentar</a>
    </main>
  );
}
