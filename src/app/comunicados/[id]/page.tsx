import { notFound } from "next/navigation";
import { PublicSection, PublicShell } from "@/components/public-site";
import { getPublicAnnouncement, getPublicSite } from "@/modules/public/service";

export const instant = false;

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [{ settings }, announcement] = await Promise.all([getPublicSite(), getPublicAnnouncement(id)]); if (!announcement) notFound(); return <PublicShell name={settings.name}><PublicSection title={announcement.title} eyebrow="Comunicado"><p className="max-w-3xl whitespace-pre-line text-lg leading-8 text-muted">{announcement.body}</p></PublicSection></PublicShell>; }
