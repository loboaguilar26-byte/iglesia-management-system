import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Restablecer contraseña", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Restablecer contraseña">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthCard>
  );
}
