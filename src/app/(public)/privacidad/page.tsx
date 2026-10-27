import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSite } from "@/modules/public/service";
import { Empty, PageHero, Section } from "../components";

export const metadata: Metadata = { title: "Aviso de privacidad" };

export default async function PrivacyPage() {
  const { settings: s } = await getPublicSite();
  return (
    <>
      <PageHero title="Aviso de privacidad" />
      <Section title={s.name}>
        {s.privacyNotice ? <div className="max-w-3xl whitespace-pre-line leading-relaxed">{s.privacyNotice}</div> : <Empty>El aviso de privacidad se publicará próximamente.</Empty>}
      </Section>
      <Section title="Solicitudes confidenciales">
        <div className="max-w-3xl space-y-3 leading-relaxed">
          <p>En las solicitudes de cita, el nombre, teléfono y correo son opcionales y se almacenan cifrados. El rol Sacerdote puede consultar esos datos para coordinar la cita.</p>
          <p>Los mensajes anónimos no solicitan ni guardan una cuenta o datos de contacto en el expediente. La infraestructura de alojamiento puede conservar registros técnicos propios del servicio. No hay un canal para responder a quien envía un mensaje anónimo.</p>
          <p>Consulta <Link href="/confesiones" className="text-primary underline">Confesiones</Link> para conocer el propósito y los límites de este espacio; no es un servicio de emergencia.</p>
        </div>
      </Section>
    </>
  );
}
