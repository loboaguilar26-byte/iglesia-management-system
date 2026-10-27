import type { Metadata } from "next";
import { Users } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { getPublicMinistries } from "@/modules/public/service";
import { Empty, PageHero, Section } from "../components";

export const metadata: Metadata = { title: "Ministerios" };

export default async function PublicMinistriesPage() {
  const ministries = await getPublicMinistries();
  return (
    <>
      <PageHero title="Ministerios" intro="Cada ministerio es una oportunidad para servir, aprender y crecer en comunidad." />
      <Section title="Encuentra tu lugar">
        {ministries.length ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ministries.map((m) => (
              <li key={m.id} className="flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <span className="inline-flex w-fit rounded-xl bg-accent-soft p-3 text-accent"><Users aria-hidden className="size-5" /></span>
                <h2 className="mt-4 font-display text-2xl font-semibold">{m.name}</h2>
                {m.description ? <p className="mt-2 whitespace-pre-line text-muted">{m.description}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Pronto compartiremos información de nuestros ministerios.</Empty>
        )}
        <div className="mt-12 rounded-3xl bg-accent-soft p-8 text-center">
          <h2 className="font-display text-2xl font-semibold">¿Te gustaría participar?</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted">Acércate después de una reunión o escríbenos y te pondremos en contacto con la persona responsable.</p>
          <Link href="/contacto" className={buttonClass("primary", "mt-6", "lg")}>Contáctanos</Link>
        </div>
      </Section>
    </>
  );
}
