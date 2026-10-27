import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { listMinistries } from "@/modules/ministries/service";
import { MinistryForm } from "./ministry-form";

export const metadata: Metadata = { title: "Ministerios" };

export default async function MinistriesPage() { const actor = await requirePageActor(); if (!can(actor, "ministries:read")) notFound(); const ministries = await listMinistries(actor); return <div className="flex max-w-6xl flex-col gap-6"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Comunidad</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Ministerios</h1><p className="mt-2 text-sm text-muted">Organiza grupos de servicio y decide cuáles aparecen en el sitio público.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{ministries.map((ministry) => <Link key={ministry.id} href={`/admin/ministerios/${ministry.id}`} className="rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-primary"><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{ministry.name}</h2><span className={`rounded-full px-2 py-1 text-xs ${ministry.isActive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{ministry.isActive ? "Activo" : "Inactivo"}</span></div>{ministry.description ? <p className="mt-2 line-clamp-3 text-sm text-muted">{ministry.description}</p> : null}<p className="mt-4 text-xs text-muted">{ministry._count.memberships} integrantes · {ministry.isPublic ? "Visible públicamente" : "Interno"}</p></Link>)}{!ministries.length ? <p className="text-sm text-muted">Aún no hay ministerios.</p> : null}</div>{can(actor, "ministries:create") ? <section className="max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-sm"><h2 className="text-lg font-semibold">Nuevo ministerio</h2><div className="mt-4"><MinistryForm id={null} /></div></section> : null}</div>; }
