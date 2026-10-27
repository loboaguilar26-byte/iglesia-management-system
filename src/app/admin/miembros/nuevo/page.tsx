import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { MemberForm } from "../member-form";

export const metadata: Metadata = { title: "Nuevo miembro" };
export default async function NewMemberPage() {
  const actor = await requirePageActor();
  if (!can(actor, "members:create")) notFound();
  return <div className="flex flex-col gap-6"><Link href="/admin/miembros" className="text-sm text-primary hover:underline">← Miembros</Link><div><h1 className="text-3xl font-semibold tracking-tight">Registrar miembro</h1><p className="mt-2 text-sm text-muted">Los campos de contacto son opcionales.</p></div><MemberForm /></div>;
}
