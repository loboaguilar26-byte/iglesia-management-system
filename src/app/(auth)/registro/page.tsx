import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { GoogleButton } from "@/components/google-button";
import { googleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };

const STEPS = [
  "Crea tu cuenta con Google: no necesitas otra contraseña.",
  "Entras a tu portal de miembro.",
  "Si la iglesia ya tiene tu ficha con ese correo, se vincula sola; si no, secretaría lo hace.",
];

export default function SignUpPage() {
  return (
    <AuthCard title="Crear cuenta" description="Únete al portal de miembros de tu iglesia.">
      {googleEnabled ? (
        <>
          <ul className="mb-5 flex flex-col gap-2.5 text-sm">
            {STEPS.map((s) => (
              <li key={s} className="flex items-start gap-2"><CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />{s}</li>
            ))}
          </ul>
          <Suspense>
            <GoogleButton label="Crear cuenta con Google" />
          </Suspense>
          <p className="mt-4 text-xs text-muted">
            Al continuar aceptas el <Link href="/privacidad" className="underline">aviso de privacidad</Link>. Solo guardamos tu nombre y correo de Google.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted">El registro en línea aún no está disponible. Pide a la secretaría de tu iglesia que te cree una cuenta.</p>
      )}
      <p className="mt-5 border-t border-border pt-4 text-center text-sm text-muted">
        ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-primary hover:underline">Iniciar sesión</Link>
      </p>
    </AuthCard>
  );
}
