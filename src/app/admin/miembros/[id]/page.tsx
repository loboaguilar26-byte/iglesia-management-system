import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { can } from "@/lib/authz";
import { AppError } from "@/lib/errors";
import { formatDate } from "@/lib/dates";
import { requirePageActor } from "@/lib/session";
import { getMember } from "@/modules/members/service";
import { MemberForm } from "../member-form";
import { MemberStatusForm } from "../member-actions";

export const metadata: Metadata = { title: "Miembro" };
export default async function MemberDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePageActor();
  if (!can(actor, "members:read")) notFound();
  const { id } = await params;
  const member = await getMember(actor, id).catch((error) => { if (error instanceof AppError && error.code === "NOT_FOUND") notFound(); throw error; });
  return <div className="flex max-w-4xl flex-col gap-6"><Link href="/admin/miembros" className="text-sm text-primary hover:underline">← Miembros</Link>{(await searchParams).creado === "1" ? <Alert tone="success">Miembro registrado correctamente.</Alert> : null}<div><h1 className="text-3xl font-semibold tracking-tight">{member.firstName} {member.lastName}</h1><p className="mt-2 text-sm text-muted">Alta: {member.joinDate ? formatDate(member.joinDate) : "sin fecha"}</p></div>{can(actor, "members:update") ? <MemberForm member={member} /> : null}{can(actor, "members:deactivate") ? <section className="max-w-3xl rounded-2xl border border-border bg-surface p-5 shadow-sm"><h2 className="font-semibold">Estado</h2><p className="mt-1 mb-4 text-sm text-muted">Desactivar conserva el historial y no elimina los datos.</p><MemberStatusForm id={member.id} active={member.status !== "INACTIVE"} /></section> : null}</div>;
}
