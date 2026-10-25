import type { Metadata } from "next";
import { getPublicEvents, getPublicSite } from "@/modules/public/service";
import { Empty, EventCard, PageHero, Section } from "../components";

export const metadata: Metadata = { title: "Eventos" };

export default async function PublicEventsPage() {
  const [{ settings }, events] = await Promise.all([getPublicSite(), getPublicEvents(50)]);
  return (
    <>
      <PageHero title="Eventos" intro="Actividades abiertas a toda la comunidad." />
      <Section title="Próximamente">
        {events.length ? (
          <div className="grid gap-4 md:grid-cols-2">{events.map((e) => <EventCard key={e.id} e={e} tz={settings.timezone} />)}</div>
        ) : (
          <Empty>No hay eventos públicos programados por ahora.</Empty>
        )}
      </Section>
    </>
  );
}
