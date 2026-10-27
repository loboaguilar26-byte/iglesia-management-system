import type { Metadata } from "next";
import Link from "next/link";
import { formatLongDate } from "@/lib/dates";
import { getPublicAnnouncements, getPublicSite } from "@/modules/public/service";
import { Empty, PageHero, Section } from "../components";

export const metadata: Metadata = { title: "Comunicados" };

export default async function PublicAnnouncementsPage() {
  const [{ settings }, items] = await Promise.all([getPublicSite(), getPublicAnnouncements(30)]);
  return (
    <>
      <PageHero title="Comunicados" intro="Avisos y noticias de nuestra comunidad." />
      <Section title="Avisos vigentes">
        {items.length ? (
          <ul className="flex flex-col gap-4">
            {items.map((a) => (
              <li key={a.id}>
                <Link href={`/comunicados/${a.id}`} className={`block rounded-2xl border bg-surface p-6 shadow-sm lift ${a.isFeatured ? "border-accent" : "border-border"}`}>
                  {a.isFeatured ? <span className="mb-2 inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">Destacado</span> : null}
                  <h2 className="font-display text-2xl font-semibold">{a.title}</h2>
                  {a.publishedAt ? <p className="mt-1 text-sm text-muted">{formatLongDate(a.publishedAt, settings.timezone)}</p> : null}
                  <p className="mt-3 line-clamp-3 text-muted">{a.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No hay comunicados por ahora.</Empty>
        )}
      </Section>
    </>
  );
}
