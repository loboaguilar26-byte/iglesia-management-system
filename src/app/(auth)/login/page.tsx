import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthCard title="Iniciar sesión" description="Acceso al panel administrativo.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
