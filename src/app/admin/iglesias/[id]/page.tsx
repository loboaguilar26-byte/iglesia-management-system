import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { db } from "@/lib/db";
import { ChurchProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Configuración de iglesia" };

export default async function ChurchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageActor();
  if (!can(actor, "churches:read")) notFound();
  const { id } = await params;
  const church = await db.church.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, code: true, franchise: { select: { name: true } }, profile: true },
  }).catch(() => null);
  if (!church) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/admin/iglesias" className="text-sm text-primary hover:underline">← Iglesias y franquicias</Link>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{church.franchise.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{church.name}</h1>
        <p className="mt-2 text-sm text-muted">Configuración de identidad, contacto y textos de esta sede.</p>
      </div>
      {!can(actor, "churches:update") ? (
        <Alert>No tienes permiso para modificar la configuración de esta iglesia.</Alert>
      ) : (
        <ChurchProfileForm church={church} />
      )}
    </div>
  );
}
