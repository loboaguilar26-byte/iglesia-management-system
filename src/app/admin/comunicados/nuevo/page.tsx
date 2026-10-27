import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can } from "@/lib/authz";
import { requirePageActor } from "@/lib/session";
import { AnnouncementForm } from "../announcement-form";

export const metadata: Metadata = { title: "Nuevo comunicado" };
export default async function NewAnnouncementPage() { const actor = await requirePageActor(); if (!can(actor, "announcements:create")) notFound(); return <div className="max-w-3xl"><h1 className="text-3xl font-semibold">Nuevo comunicado</h1><p className="mt-2 text-sm text-muted">Comparte información importante con la iglesia.</p><section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm"><AnnouncementForm id={null} /></section></div>; }
