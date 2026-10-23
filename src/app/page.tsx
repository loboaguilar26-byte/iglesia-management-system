import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

// Página pública provisional. El sitio público configurable se construye en la Fase 2.
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold">Sitio en construcción</h1>
      <p className="max-w-md text-muted">
        La información pública de la iglesia (horarios, eventos y comunicados) estará disponible próximamente.
      </p>
      <Link href="/admin" className={buttonClass("secondary")}>
        Acceso administrativo
      </Link>
    </main>
  );
}
