import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getPublicSite } from "@/modules/public/service";
import { Empty, PageHero, Section } from "../components";

export const metadata: Metadata = { title: "Nosotros" };

export default async function AboutPage() {
  const { settings: s } = await getPublicSite();
  const values = (s.valuesText ?? "").split("\n").map((v) => v.trim()).filter(Boolean);
  return (
    <>
      <PageHero title="Quiénes somos" intro={s.tagline ?? undefined} />
      <Section title="Nuestra historia y comunidad">
        {s.aboutText ? <div className="max-w-3xl whitespace-pre-line text-lg leading-relaxed">{s.aboutText}</div> : <Empty>Pronto compartiremos más sobre nosotros.</Empty>}
      </Section>
      {s.mission || s.vision ? (
        <Section title="Misión y visión" tone="tinted">
          <div className="grid gap-6 md:grid-cols-2">
            {s.mission ? <div className="rounded-3xl border-l-4 border-accent bg-background p-8"><p className="text-sm font-semibold uppercase tracking-wider text-accent">Misión</p><p className="mt-3 whitespace-pre-line text-lg leading-relaxed">{s.mission}</p></div> : null}
            {s.vision ? <div className="rounded-3xl border-l-4 border-primary bg-background p-8"><p className="text-sm font-semibold uppercase tracking-wider text-primary">Visión</p><p className="mt-3 whitespace-pre-line text-lg leading-relaxed">{s.vision}</p></div> : null}
          </div>
        </Section>
      ) : null}
      {values.length ? (
        <Section title="Nuestros valores">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => (
              <li key={v} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5">
                <span className="rounded-full bg-accent-soft p-1.5 text-accent"><Check aria-hidden className="size-4" /></span>
                <span className="text-lg">{v}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
