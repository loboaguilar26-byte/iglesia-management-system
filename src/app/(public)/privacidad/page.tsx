import type { Metadata } from "next";
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
    </>
  );
}
