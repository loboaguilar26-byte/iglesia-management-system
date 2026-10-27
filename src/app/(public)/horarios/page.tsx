import type { Metadata } from "next";
import { getPublicSite } from "@/modules/public/service";
import { Empty, PageHero, ScheduleCards, Section } from "../components";

export const metadata: Metadata = { title: "Horarios" };

export default async function SchedulesPage() {
  const { settings: s, schedules } = await getPublicSite();
  return (
    <>
      <PageHero title="Horarios de reunión" intro={s.scheduleText ?? "Te esperamos en nuestras reuniones semanales."} />
      <Section title="Cada semana">
        {schedules.length ? <ScheduleCards schedules={schedules} /> : <Empty>Pronto publicaremos nuestros horarios.</Empty>}
      </Section>
    </>
  );
}
