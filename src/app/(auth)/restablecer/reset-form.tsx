"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";
import { passwordSchema } from "@/modules/users/schema";

export function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [errors, setErrors] = useState<{ password?: string[]; form?: string }>({});
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");

  if (!token || params.get("error")) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="error">El enlace no es válido o ya venció. Solicita uno nuevo.</Alert>
        <Link href="/recuperar" className="text-center text-sm text-primary hover:underline">
          Solicitar otro enlace
        </Link>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">Tu contraseña se actualizó. Se cerraron las sesiones anteriores.</Alert>
        <Link href="/login" className="text-center text-sm text-primary hover:underline">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return setErrors({ password: parsed.error.issues.map((i) => i.message) });
    if (password !== form.get("confirm")) return setErrors({ form: "Las contraseñas no coinciden." });

    setState("pending");
    setErrors({});
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    if (error) {
      setState("idle");
      setErrors({
        form:
          error.status === 429
            ? "Demasiados intentos. Espera unos minutos."
            : "El enlace no es válido o ya venció. Solicita uno nuevo.",
      });
      return;
    }
    setState("done");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
      <Field
        label="Nueva contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        hint={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`}
        errors={errors.password}
        required
      />
      <Field label="Confirmar contraseña" name="confirm" type="password" autoComplete="new-password" required />
      <Button type="submit" disabled={state === "pending"}>
        {state === "pending" ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
