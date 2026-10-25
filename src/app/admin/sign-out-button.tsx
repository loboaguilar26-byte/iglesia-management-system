"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      aria-label="Cerrar sesión"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.replace("/login");
        router.refresh();
      }}
    >
      <LogOut aria-hidden className="size-4" />
      <span className="hidden sm:inline">{pending ? "Saliendo…" : "Cerrar sesión"}</span>
    </Button>
  );
}
