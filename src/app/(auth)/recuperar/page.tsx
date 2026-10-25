"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export default function RecoverPasswordPage() {
  const [state, setState] = useState<"idle" | "pending" | "sent" | "rate-limited">("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setState("pending");
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/restablecer" });
    // Misma respuesta exista o no el correo, para no revelar cuentas registradas.
    setState(error?.status === 429 ? "rate-limited" : "sent");
  }

  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Te enviaremos un enlace para crear una nueva contraseña."
    >
      {state === "sent" ? (
        <div className="flex flex-col gap-4">
          <Alert tone="success">
            Si el correo está registrado, recibirás un enlace válido por 30 minutos.
          </Alert>
          <Link href="/login" className="text-center text-sm text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {state === "rate-limited" ? (
            <Alert tone="error">Demasiadas solicitudes. Espera unos minutos.</Alert>
          ) : null}
          <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required />
          <Button type="submit" disabled={state === "pending"}>
            {state === "pending" ? "Enviando…" : "Enviar enlace"}
          </Button>
          <Link href="/login" className="text-center text-sm text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
