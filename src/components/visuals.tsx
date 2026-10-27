import type { CSSProperties, ReactNode } from "react";

/** Anillo de avance (0–100) animado; el porcentaje se lee en texto para lectores de pantalla. */
export function ProgressRing({ percent, size = 96, label, children }: { percent: number; size?: number; label: string; children?: ReactNode }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, percent)) / 100);
  const tone = percent >= 80 ? "var(--success)" : percent >= 50 ? "var(--accent)" : "var(--danger)";
  return (
    <div className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${percent} %`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="ring-fill"
          style={{ "--ring-from": circ, "--ring-to": offset } as CSSProperties}
        />
      </svg>
      <span aria-hidden className="relative text-center leading-tight">
        {children ?? <span className="font-display text-xl font-semibold tabular-nums">{percent}%</span>}
      </span>
    </div>
  );
}

/** Barra horizontal de avance con animación de crecimiento. */
export function ProgressBar({ percent, className = "" }: { percent: number; className?: string }) {
  const tone = percent >= 80 ? "bg-success" : percent >= 50 ? "bg-accent" : "bg-danger";
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-surface-2 ${className}`} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={`bar-grow h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Franja con los colores de identidad de una sede. */
export function ChurchBanner({ primary, accent, className = "", children }: { primary: string; accent: string; className?: string; children?: ReactNode }) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(125deg, ${primary} 0%, ${primary} 55%, ${accent} 140%)` }}
    >
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full opacity-30 blur-2xl" style={{ background: accent }} />
      <span aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 size-32 rounded-full bg-white/10 blur-2xl" />
      {children}
    </div>
  );
}

/** Iniciales de una sede sobre sus colores (sustituye al logotipo mientras no exista). */
export function ChurchMonogram({ name, primary, accent, size = "md" }: { name: string; primary: string; accent: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || name.slice(0, 2).toUpperCase();
  const dims = { sm: "size-9 text-xs", md: "size-12 text-sm", lg: "size-16 text-lg" }[size];
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-2xl font-display font-semibold text-white shadow-md ring-2 ring-white/40 ${dims}`}
      style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
    >
      {initials}
    </span>
  );
}
