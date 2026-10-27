import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { getPublicSite } from "@/modules/public/service";
import { Empty, PageHero, Section } from "../components";

export const metadata: Metadata = { title: "Contacto" };

export default async function ContactPage() {
  const { settings: s } = await getPublicSite();
  const items = [
    s.address && { icon: MapPin, label: "Dirección", value: s.address, href: s.mapUrl },
    s.phone && { icon: Phone, label: "Teléfono", value: s.phone, href: `tel:${s.phone.replace(/\s/g, "")}` },
    s.whatsapp && { icon: MessageCircle, label: "WhatsApp", value: s.whatsapp, href: `https://wa.me/${s.whatsapp.replace(/\D/g, "")}` },
    s.email && { icon: Mail, label: "Correo", value: s.email, href: `mailto:${s.email}` },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href: string | null }[];
  return (
    <>
      <PageHero title="Ubicación y contacto" intro="Estamos para servirte." />
      <Section title="¿Cómo encontrarnos?">
        {items.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((i) => (
              <div key={i.label} className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-6">
                <span className="rounded-xl bg-accent-soft p-3 text-accent"><i.icon aria-hidden className="size-5" /></span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted">{i.label}</p>
                  {i.href ? (
                    <a href={i.href} className="mt-1 block break-words text-lg font-medium hover:text-primary hover:underline" {...(i.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{i.value}</a>
                  ) : (
                    <p className="mt-1 text-lg font-medium">{i.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Pronto publicaremos nuestros datos de contacto.</Empty>
        )}
        {s.mapUrl ? <a href={s.mapUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "mt-8", "lg")}>Abrir en el mapa</a> : null}
      </Section>
    </>
  );
}
