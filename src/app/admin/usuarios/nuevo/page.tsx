import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { CreateUserForm } from "./create-user-form";

export const metadata: Metadata = { title: "Nuevo usuario" };

export default async function NewUserPage() {
  const actor = await requirePageActor();
  if (!can(actor, "users:create") || !can(actor, "roles:assign")) notFound();
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <Link href="/admin/usuarios" className="text-sm text-primary hover:underline">← Usuarios</Link>
      <h1 className="text-2xl font-semibold">Nuevo usuario</h1>
      <CreateUserForm />
    </div>
  );
}
