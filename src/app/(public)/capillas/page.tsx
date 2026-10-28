import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { ChurchMonogram } from "@/components/visuals";
import { getPublicChapels } from "@/modules/public/service";
import { Empty, PageHero, Section } from "../components";

export const metadata: Metadata = {
  title: "Capillas",
  description: "Nuestras capillas: una misma familia de fe, cada una con su propia comunidad.",
};

export default async function PublicChapelsPage() {
  const chapels = await getPublicChapels();
  return (
    <>
      <PageHero title="Nuestras capillas" intro="Una misma familia de fe en distintos lugares. Cada capilla tiene su comunidad, sus horarios y su manera de servir." />
      <Section title="Encuentra la más cercana">
        {chapels.length ? (
          <ul className="stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {chapels.map((c) => {
              const slug = c.code.toLowerCase();
              return (
                <li key={c.id}>
                  <Link href={`/capillas/${slug}`} className="lift group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
                    <div className="relative h-36 overflow-hidden" style={{ background: `linear-gradient(135deg, ${c.primaryColor}, ${c.accentColor})` }}>
                      {c.coverPath ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/media/capilla/${slug}?v=${encodeURIComponent(c.coverPath)}`} alt="" className="absolute inset-0 size-full object-cover opacity-60 transition duration-500 group-hover:scale-105" />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-3 left-4">
                        <ChurchMonogram name={c.name} primary={c.primaryColor} accent={c.accentColor} />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <h2 className="font-display text-2xl font-semibold group-hover:text-primary">{c.name}</h2>
                      {c.tagline ? <p className="text-muted">{c.tagline}</p> : null}
                      {c.address ? <p className="mt-auto flex items-start gap-1.5 pt-2 text-sm text-muted"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0" style={{ color: c.accentColor }} />{c.address}</p> : null}
                      <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: c.primaryColor }}>
                        Conocer la capilla <ArrowRight aria-hidden className="size-4 transition group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>Pronto publicaremos nuestras capillas.</Empty>
        )}
      </Section>
    </>
  );
}
