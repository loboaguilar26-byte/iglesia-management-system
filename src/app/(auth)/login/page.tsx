import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthCard title="Te damos la bienvenida" description="Inicia sesión para entrar al panel o a tu portal de miembro.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
