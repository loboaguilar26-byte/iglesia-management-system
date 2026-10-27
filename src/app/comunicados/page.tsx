import Link from "next/link";
import { PublicSection, PublicShell } from "@/components/public-site";
import { getPublicAnnouncements, getPublicSite } from "@/modules/public/service";

export default async function AnnouncementsPage() { const [{ settings }, announcements] = await Promise.all([getPublicSite(), getPublicAnnouncements(50)]); return <PublicShell name={settings.name}><PublicSection title="Comunicados" eyebrow="Información"><div className="grid gap-4 md:grid-cols-2">{announcements.map((announcement) => <Link key={announcement.id} href={`/comunicados/${announcement.id}`} className="rounded-2xl border border-border bg-surface p-6 shadow-sm hover:border-primary"><h2 className="text-xl font-semibold">{announcement.title}</h2><p className="mt-3 line-clamp-5 whitespace-pre-line text-muted">{announcement.body}</p></Link>)}</div>{!announcements.length ? <p className="text-muted">No hay comunicados publicados.</p> : null}</PublicSection></PublicShell>; }
