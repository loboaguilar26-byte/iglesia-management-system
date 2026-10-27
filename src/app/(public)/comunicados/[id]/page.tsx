import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatLongDate } from "@/lib/dates";
import { getPublicAnnouncement, getPublicSite } from "@/modules/public/service";

export async function generateMetadata({ params }: PageProps<"/comunicados/[id]">): Promise<Metadata> {
  const a = await getPublicAnnouncement((await params).id);
  return { title: a?.title ?? "Comunicado", description: a?.body.slice(0, 160) };
}

export default function PublicAnnouncementPage({ params }: PageProps<"/comunicados/[id]">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-3xl px-4 py-14 text-muted sm:px-6">Cargando…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/comunicados/[id]">["params"] }) {
  const { id } = await params;
  const [{ settings }, a] = await Promise.all([getPublicSite(), getPublicAnnouncement(id)]);
  if (!a) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Link href="/comunicados" className="text-sm text-primary hover:underline">← Comunicados</Link>
      <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{a.title}</h1>
      {a.publishedAt ? <p className="mt-3 text-muted">{formatLongDate(a.publishedAt, settings.timezone)}</p> : null}
      <div className="mt-8 whitespace-pre-line text-lg leading-relaxed">{a.body}</div>
    </article>
  );
}
