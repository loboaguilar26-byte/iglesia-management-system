import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { listAnnouncements } from "@/modules/announcements/service";

export const metadata: Metadata = { title: "Comunicados" };

export default async function AnnouncementsAdminPage() { const actor = await requirePageActor(); if (!can(actor, "announcements:read")) notFound(); const announcements = await listAnnouncements(actor); return <div className="flex max-w-5xl flex-col gap-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Comunicación</p><h1 className="mt-2 text-3xl font-semibold">Comunicados</h1><p className="mt-2 text-sm text-muted">Redacta avisos internos o publícalos en el sitio.</p></div>{can(actor, "announcements:create") ? <Link href="/admin/comunicados/nuevo" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Nuevo comunicado</Link> : null}</div><div className="flex flex-col gap-3">{announcements.map((announcement) => <Link key={announcement.id} href={`/admin/comunicados/${announcement.id}`} className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-primary"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{announcement.title}</h2><span className="rounded-full bg-background px-2 py-1 text-xs">{announcement.status === "PUBLISHED" ? "Publicado" : announcement.status === "DRAFT" ? "Borrador" : "Archivado"}</span></div><p className="mt-2 line-clamp-2 text-sm text-muted">{announcement.body}</p><p className="mt-3 text-xs text-muted">Autor: {announcement.author.name}</p></Link>)}{!announcements.length ? <p className="text-sm text-muted">No hay comunicados todavía.</p> : null}</div></div>; }
