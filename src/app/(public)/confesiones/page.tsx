import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { LockKeyhole } from "lucide-react";
import { toLocalInput } from "@/lib/dates";
import { getPublicConfessionLocations } from "@/modules/confessions/service";
import { PageHero, Section } from "../components";
import { ConfessionForms } from "./confession-forms";

export const metadata: Metadata = {
  title: "Confesiones",
  description: "Solicita una cita privada o comparte un mensaje anónimo y confidencial.",
};

/** Ventana para solicitar cita: desde una hora hasta 90 días a partir de ahora (igual que el servicio). */
function bookingWindow(timezone: string) {
  const now = Date.now();
  return {
    minimumDate: toLocalInput(new Date(now + 60 * 60 * 1000), timezone),
    maximumDate: toLocalInput(new Date(now + 90 * 86400000), timezone),
  };
}

export default function ConfessionsPage() {
  return (
    <>
      <PageHero
        title="Confesiones y acompañamiento"
        intro="Un espacio de escucha, respeto y confidencialidad. Puedes pedir una cita en la iglesia o en una capilla, o compartir un mensaje anónimo."
      />
      <Section title="Un espacio seguro" intro="Las solicitudes y mensajes se protegen y se reservan al equipo sacerdotal.">
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft/50 p-4 text-sm">
          <LockKeyhole aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
          <p>
            El expediente anónimo no guarda cuenta, nombre, contacto ni dirección IP. La infraestructura de alojamiento puede conservar registros técnicos propios; el contenido se cifra y solo el rol Sacerdote puede leerlo o responderlo.
          </p>
        </div>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface-2" />}>
          <BookingForms />
        </Suspense>
      </Section>
    </>
  );
}

/** Capillas activas y horario disponible: se calculan en cada visita. */
async function BookingForms() {
  await connection();
  const { mainChurchName, timezone, chapels } = await getPublicConfessionLocations();
  const { minimumDate, maximumDate } = bookingWindow(timezone);
  return (
    <ConfessionForms
      mainChurchName={mainChurchName}
      chapels={chapels}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      timezone={timezone}
    />
  );
}
