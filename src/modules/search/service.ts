import { can, requireActor, type Actor } from "@/lib/authz";
import { db } from "@/lib/db";
import { normalizeSearch } from "@/lib/text";
import { eventScopeWhere, memberScopeWhere } from "../scope";

export type SearchResult = { kind: "member" | "event" | "ministry" | "announcement"; id: string; title: string; subtitle?: string; href: string };

/**
 * Búsqueda global del panel. Cada categoría se consulta solo si el actor tiene permiso de
 * lectura, y con el mismo alcance que la pantalla correspondiente.
 */
export async function globalSearch(actor: Actor | null, q: string): Promise<SearchResult[]> {
  const a = requireActor(actor);
  const term = q.trim();
  if (term.length < 2) return [];
  const norm = normalizeSearch(term);
  const tasks: Promise<SearchResult[]>[] = [];

  if (can(a, "members:read")) {
    tasks.push(
      memberScopeWhere(a, "members:read").then((scope) =>
        db.member
          .findMany({ where: { ...(scope ?? {}), searchName: { contains: norm } }, take: 6, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, status: true } })
          .then((rows) => rows.map((m) => ({ kind: "member" as const, id: m.id, title: `${m.firstName} ${m.lastName}`, subtitle: m.status === "ACTIVE" ? "Miembro activo" : m.status === "VISITOR" ? "Visitante" : "Inactivo", href: `/admin/miembros/${m.id}` }))),
      ),
    );
  }
  if (can(a, "events:read")) {
    tasks.push(
      eventScopeWhere(a, "events:read").then((scope) =>
        db.event
          .findMany({ where: { AND: [scope ?? {}, { title: { contains: term, mode: "insensitive" } }] }, take: 6, orderBy: { startsAt: "desc" }, select: { id: true, title: true, startsAt: true, status: true } })
          .then((rows) => rows.map((e) => ({ kind: "event" as const, id: e.id, title: e.title, subtitle: `${e.startsAt.toISOString().slice(0, 10)}${e.status === "CANCELLED" ? " · cancelado" : ""}`, href: `/admin/eventos/${e.id}` }))),
      ),
    );
  }
  if (can(a, "ministries:read")) {
    tasks.push(
      db.ministry
        .findMany({ where: { name: { contains: term, mode: "insensitive" } }, take: 4, select: { id: true, name: true, isActive: true } })
        .then((rows) => rows.map((m) => ({ kind: "ministry" as const, id: m.id, title: m.name, subtitle: m.isActive ? "Ministerio" : "Ministerio inactivo", href: `/admin/ministerios/${m.id}` }))),
    );
  }
  if (can(a, "announcements:read")) {
    tasks.push(
      db.announcement
        .findMany({ where: { title: { contains: term, mode: "insensitive" }, status: { not: "ARCHIVED" } }, take: 4, select: { id: true, title: true, status: true } })
        .then((rows) => rows.map((n) => ({ kind: "announcement" as const, id: n.id, title: n.title, subtitle: n.status === "DRAFT" ? "Comunicado (borrador)" : "Comunicado", href: `/admin/comunicados/${n.id}` }))),
    );
  }
  return (await Promise.all(tasks)).flat();
}
