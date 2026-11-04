import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { GoogleButton } from "@/components/google-button";
import { googleEnabled } from "@/lib/auth";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };

export default function SignUpPage() {
  return (
    <AuthCard title="Crear cuenta" description="Únete al portal de miembros de tu iglesia. Secretaría vinculará tu cuenta con tu ficha de miembro.">
      {googleEnabled ? (
        <>
          <Suspense>
            <GoogleButton label="Crear cuenta con Google" />
          </Suspense>
          <p className="mt-3 text-xs text-muted">
            Al continuar con Google aceptas el <Link href="/privacidad" className="underline">aviso de privacidad</Link>. Solo guardamos tu nombre y correo.
          </p>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />o con tu correo<span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}
      <SignUpForm />
      <p className="mt-5 border-t border-border pt-4 text-center text-sm text-muted">
        ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-primary hover:underline">Iniciar sesión</Link>
      </p>
    </AuthCard>
  );
}
