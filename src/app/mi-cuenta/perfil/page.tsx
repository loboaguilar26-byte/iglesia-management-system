import type { Metadata } from "next";
import { Download, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { buttonClass } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Badge, Card } from "@/components/ui/layout";
import { formatDateOnly } from "@/lib/dates";
import { requirePortalActor } from "@/lib/session";
import { MEMBER_STATUS_LABEL } from "@/modules/members/schema";
import { getMyPortal } from "@/modules/portal/service";
import { getSettingsInternal } from "@/modules/settings/service";
import { updateMyContactAction } from "../actions";
import { PortalHeading, portalBlocker } from "../portal-ui";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const actor = await requirePortalActor();
  const blocked = portalBlocker(actor);
  if (blocked) return blocked;
  const [{ member: m }, settings] = await Promise.all([getMyPortal(actor), getSettingsInternal()]);

  return (
    <div className="flex flex-col gap-6">
      <PortalHeading eyebrow="Mi cuenta" title="Mi perfil" description="Tus datos en la iglesia y tus derechos sobre ellos." />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Mi ficha">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted">Nombre</dt><dd className="font-medium">{m.firstName} {m.lastName}</dd>
            <dt className="text-muted">Estado</dt><dd><Badge tone={m.status === "ACTIVE" ? "success" : "neutral"}>{MEMBER_STATUS_LABEL[m.status]}</Badge></dd>
            <dt className="text-muted">Miembro desde</dt><dd>{m.joinDate ? formatDateOnly(m.joinDate) : "—"}</dd>
            {m.position ? (<><dt className="text-muted">Cargo</dt><dd>{m.position}</dd></>) : null}
            <dt className="text-muted">Cuenta</dt><dd className="truncate">{actor.email}</dd>
          </dl>
          <p className="mt-4 text-xs text-muted">Para corregir tu nombre u otros datos de la ficha, contacta a la secretaría.</p>
        </Card>

        <Card title="Datos de contacto" description="Mantén actualizados tu teléfono y correo de contacto.">
          <ActionForm action={updateMyContactAction}>
            <Field label="Teléfono" name="phone" type="tel" defaultValue={m.phone ?? ""} />
            <Field label="Correo electrónico" name="email" type="email" defaultValue={m.email ?? ""} hint="Este correo es de contacto; no cambia el correo con el que inicias sesión." />
            <SubmitButton>Guardar</SubmitButton>
          </ActionForm>
        </Card>

        <Card title="Privacidad y mis datos">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
            <p className="text-sm text-muted">
              Conforme a la Ley Federal de Protección de Datos Personales, puedes acceder a tus datos, rectificarlos, cancelarlos u oponerte a su uso (derechos ARCO).
              Descarga aquí una copia de todo lo que guardamos sobre ti.
            </p>
          </div>
          <a href="/mi-cuenta/perfil/mis-datos" className={buttonClass("secondary", "mt-4")} download>
            <Download aria-hidden className="size-4" /> Descargar mis datos (JSON)
          </a>
          <p className="mt-3 text-xs text-muted">Para cancelación u oposición, escribe a la secretaría; la descarga queda registrada en la bitácora.</p>
        </Card>

        {settings.phone || settings.email || settings.address ? (
          <Card title="Contacto de la iglesia">
            <ul className="flex flex-col gap-2 text-sm">
              {settings.phone ? <li className="flex items-center gap-2"><Phone aria-hidden className="size-4 text-accent" /><a href={`tel:${settings.phone.replace(/\s+/g, "")}`} className="hover:underline">{settings.phone}</a></li> : null}
              {settings.email ? <li className="flex items-center gap-2"><Mail aria-hidden className="size-4 text-accent" /><a href={`mailto:${settings.email}`} className="hover:underline">{settings.email}</a></li> : null}
              {settings.address ? <li className="flex items-center gap-2"><MapPin aria-hidden className="size-4 text-accent" />{settings.address}</li> : null}
            </ul>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
