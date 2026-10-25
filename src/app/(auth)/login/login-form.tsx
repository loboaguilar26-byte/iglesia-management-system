"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { safeAdminPath } from "@/lib/redirects";

function loginErrorMessage(status: number) {
  if (status === 429) return "Demasiados intentos. Espera un minuto e inténtalo de nuevo.";
  if (status === 403) return "No fue posible iniciar sesión. Si tu cuenta está desactivada, contacta al administrador.";
  return "Correo o contraseña incorrectos.";
}

export function LoginForm() {
  const router = useRouter();
  const next = safeAdminPath(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (error) {
      setError(loginErrorMessage(error.status));
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required />
      <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Iniciar sesión"}
      </Button>
      <Link href="/recuperar" className="text-center text-sm text-primary underline-offset-4 hover:underline">
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}
