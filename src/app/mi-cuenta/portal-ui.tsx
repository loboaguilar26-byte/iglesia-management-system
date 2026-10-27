import Link from "next/link";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/layout";
import { can, type Actor } from "@/lib/authz";

/** Estado cuando la cuenta no puede usar el portal (sin permiso o sin ficha vinculada); null si puede. */
export function portalBlocker(actor: Actor): ReactNode | null {
  if (!can(actor, "portal:access")) {
    return (
      <EmptyState
        title="Tu cuenta no tiene acceso al portal del miembro"
        description="Si formas parte del personal, entra al panel administrativo."
        action={<Link href="/admin" className="text-primary hover:underline">Ir al panel</Link>}
      />
    );
  }
  if (!actor.memberId) return <Alert tone="info">Tu cuenta aún no está vinculada a una ficha de miembro. Pide a la secretaría que la vincule.</Alert>;
  return null;
}

/** Encabezado de cada apartado del portal. */
export function PortalHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Fecha en bloque (mes y día) para listas de eventos. */
export function DateBlock({ date, tz }: { date: Date; tz: string }) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-brand py-1.5 text-white shadow-sm">
      <span className="text-[10px] font-semibold uppercase">{new Intl.DateTimeFormat("es-MX", { timeZone: tz, month: "short" }).format(date)}</span>
      <span className="font-display text-xl font-semibold leading-none">{new Intl.DateTimeFormat("es-MX", { timeZone: tz, day: "numeric" }).format(date)}</span>
    </div>
  );
}
