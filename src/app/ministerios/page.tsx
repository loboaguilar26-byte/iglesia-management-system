import { Users } from "lucide-react";
import { PublicSection, PublicShell } from "@/components/public-site";
import { getPublicMinistries, getPublicSite } from "@/modules/public/service";

export default async function MinistriesPage() { const [{ settings }, ministries] = await Promise.all([getPublicSite(), getPublicMinistries()]); return <PublicShell name={settings.name}><PublicSection title="Ministerios" eyebrow="Comunidad"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{ministries.map((ministry) => <article key={ministry.id} className="rounded-2xl border border-border bg-surface p-6 shadow-sm"><Users className="size-6 text-primary" aria-hidden /><h2 className="mt-4 text-xl font-semibold">{ministry.name}</h2>{ministry.description ? <p className="mt-3 text-muted">{ministry.description}</p> : null}</article>)}</div>{!ministries.length ? <p className="text-muted">Aún no hay ministerios publicados.</p> : null}</PublicSection></PublicShell>; }
