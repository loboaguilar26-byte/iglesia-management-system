import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { GoogleButton } from "@/components/google-button";
import { googleEnabled } from "@/lib/auth";
import { safeAdminPath } from "@/lib/redirects";
import { getActor } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthCard title="Iniciar sesión" description="Te damos la bienvenida. Entra al panel o a tu portal de miembro.">
      {googleEnabled ? (
        <>
          <Suspense>
            <GoogleButton />
          </Suspense>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />o con tu correo<span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}
      <Suspense>
        <RedirectIfSignedIn searchParams={searchParams} />
        <LoginForm />
      </Suspense>
      {googleEnabled ? (
        <p className="mt-5 border-t border-border pt-4 text-center text-sm text-muted">
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="font-semibold text-primary hover:underline">Crear cuenta</Link>
        </p>
      ) : null}
    </AuthCard>
  );
}

// Con una sesión vigente no se vuelve a pedir el login: entra directo al destino.
async function RedirectIfSignedIn({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const actor = await getActor();
  if (actor) {
    const { next } = await searchParams;
    redirect(safeAdminPath(typeof next === "string" ? next : null));
  }
  return null;
}
