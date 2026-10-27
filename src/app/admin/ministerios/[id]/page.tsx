import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { getMinistry } from "@/modules/ministries/service";
import { MinistryForm } from "../ministry-form";

export const metadata: Metadata = { title: "Ministerio" };

export default async function MinistryDetailPage({ params }: { params: Promise<{ id: string }> }) { const actor = await requirePageActor(); if (!can(actor, "ministries:read")) notFound(); const { id } = await params; const ministry = await getMinistry(actor, id); return <div className="flex max-w-3xl flex-col gap-6"><Link href="/admin/ministerios" className="text-sm text-primary hover:underline">← Ministerios</Link><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Ministerio</p><h1 className="mt-2 text-3xl font-semibold">{ministry.name}</h1><p className="mt-2 text-sm text-muted">{ministry.memberships.length} integrantes activos.</p></div>{can(actor, "ministries:update") ? <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><MinistryForm id={ministry.id} name={ministry.name} description={ministry.description ?? ""} isPublic={ministry.isPublic} /></section> : null}<section className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><h2 className="text-lg font-semibold">Integrantes</h2>{ministry.memberships.length ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{ministry.memberships.map((membership) => <li key={membership.id} className="rounded-lg border border-border px-3 py-2 text-sm">{membership.member.firstName} {membership.member.lastName}</li>)}</ul> : <p className="mt-3 text-sm text-muted">Todavía no hay integrantes registrados.</p>}</section></div>; }
