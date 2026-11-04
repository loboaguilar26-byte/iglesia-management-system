"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";

function signUpErrorMessage(status: number) {
  if (status === 429) return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  return "No fue posible crear la cuenta con esos datos. Si ya tienes una, inicia sesión.";
}

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (name.length < 3) return setError("Escribe tu nombre completo.");
    if (!email.includes("@")) return setError("Escribe un correo electrónico válido.");
    if (password.length < PASSWORD_MIN_LENGTH) return setError(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
    if (password !== form.get("confirm")) return setError("Las contraseñas no coinciden.");
    if (!form.get("privacy")) return setError("Para crear tu cuenta debes aceptar el aviso de privacidad.");

    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      setError(signUpErrorMessage(error.status));
      setPending(false);
      return;
    }
    router.replace("/mi-cuenta");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Field label="Nombre completo" name="name" autoComplete="name" required maxLength={120} />
      <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required />
      <Field label="Contraseña" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required maxLength={PASSWORD_MAX_LENGTH} hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`} />
      <Field label="Confirmar contraseña" name="confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" required maxLength={PASSWORD_MAX_LENGTH} />
      <label className="-mt-2 flex w-fit cursor-pointer items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="size-4 accent-[var(--accent)]" />
        Mostrar contraseña
      </label>
      <label className="flex cursor-pointer items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="privacy" className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" />
        <span>Acepto el <Link href="/privacidad" className="underline">aviso de privacidad</Link>.</span>
      </label>
      <Button type="submit" disabled={pending} className="btn-shine mt-1">
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
