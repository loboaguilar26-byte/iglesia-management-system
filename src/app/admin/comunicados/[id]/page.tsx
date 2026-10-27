import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { getAnnouncement } from "@/modules/announcements/service";
import { AnnouncementForm } from "../announcement-form";

export const metadata: Metadata = { title: "Comunicado" };
export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) { const actor = await requirePageActor(); if (!can(actor, "announcements:read")) notFound(); const { id } = await params; const announcement = await getAnnouncement(actor, id); return <div className="flex max-w-3xl flex-col gap-6"><Link href="/admin/comunicados" className="text-sm text-primary hover:underline">← Comunicados</Link><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Comunicación</p><h1 className="mt-2 text-3xl font-semibold">{announcement.title}</h1></div>{can(actor, "announcements:update") ? <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><AnnouncementForm id={announcement.id} title={announcement.title} body={announcement.body} visibility={announcement.visibility} isFeatured={announcement.isFeatured} expiresAt={announcement.expiresAt} status={announcement.status} /></section> : <p className="whitespace-pre-line text-muted">{announcement.body}</p>}</div>; }
