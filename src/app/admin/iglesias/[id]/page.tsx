import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, Circle, Crown, History, Mail, MapPin, Palette, Phone, Settings2, UsersRound } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert } from "@/components/ui/alert";
import { CheckboxField, SelectField, TextArea } from "@/components/ui/field";
import { Badge, Card, EmptyState, StatCard } from "@/components/ui/layout";
import { can, type Actor } from "@/lib/authz";
import { formatDate, formatDateTime } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { requirePageActor } from "@/lib/session";
import { describeAction } from "@/modules/audit/service";
import { churchTeamOptions, getChurchDetail } from "@/modules/churches/service";
import { addChurchTeamAction, removeChurchTeamAction, setChurchStatusAction } from "../actions";
import { ChurchBanner, ChurchMonogram, ProgressRing } from "@/components/visuals";
import { ChurchProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Iglesia" };

type Detail = Awaited<ReturnType<typeof getChurchDetail>>;

export default async function ChurchDetailPage({ params, searchParams }: PageProps<"/admin/iglesias/[id]">) {
  const actor = await requirePageActor();
  if (!can(actor, "churches:read")) notFound();
  const { id } = await params;
  const sp = await searchParams;
  const d = await getChurchDetail(actor, id).catch((e) => {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const c = d.church;
  const primary = c.profile?.primaryColor ?? "#10253d";
  const accent = c.profile?.accentColor ?? "#c8832a";

  const tabs = [
    { key: "resumen", label: "Resumen", icon: CalendarClock, show: true },
    { key: "identidad", label: "Identidad y contacto", icon: Palette, show: true },
    { key: "equipo", label: "Equipo", icon: UsersRound, show: true },
    { key: "historial", label: "Historial", icon: History, show: !!d.history },
    { key: "gestion", label: "Gestión", icon: Settings2, show: can(actor, "churches:update") },
  ].filter((t) => t.show);
  const tab = tabs.some((t) => t.key === sp.tab) ? String(sp.tab) : "resumen";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/iglesias?tab=red" className="w-fit text-sm text-primary hover:underline">← Iglesias y franquicias</Link>

      <ChurchBanner primary={primary} accent={accent} className="rounded-3xl p-6 text-white shadow-lg sm:p-8">
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <ChurchMonogram name={c.name} primary={primary} accent={accent} size="lg" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{c.franchise.name}</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight">{c.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/80">
                <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-xs">{c.code ?? c.slug}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.isActive ? "bg-white/20" : "bg-black/25"}`}>
                  <span className={`size-1.5 rounded-full ${c.isActive ? "pulse-dot bg-emerald-300 text-emerald-300" : "bg-white/60"}`} />
                  {c.isActive ? "Activa" : "Inactiva"}
                </span>
                <span>Alta {formatDate(c.createdAt)}</span>
              </p>
              {d.chapel ? (
                <p className="mt-3 flex flex-wrap gap-2 text-sm font-medium">
                  {d.chapel.isPublic && d.chapel.status === "ACTIVE" ? (
                    <Link href={`/capillas/${d.chapel.code.toLowerCase()}`} target="_blank" className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">Ver sitio público ↗</Link>
                  ) : null}
                  <Link href={`/admin/capillas/${d.chapel.id}`} className="rounded-lg bg-white/15 px-3 py-1.5 hover:bg-white/25">Miembros, eventos y aportaciones</Link>
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-black/15 p-3 backdrop-blur">
            <ProgressRing percent={d.readiness.percent} size={84} label="Preparación de la sede">
              <span className="font-display text-xl font-semibold tabular-nums text-white">{d.readiness.percent}%</span>
            </ProgressRing>
            <div className="pr-2 text-sm">
              <p className="font-semibold">Preparación</p>
              <p className="text-white/75">{d.readiness.done} de {d.readiness.total} puntos</p>
            </div>
          </div>
        </div>
      </ChurchBanner>

      {!c.isActive ? <Alert tone="info">Esta iglesia está inactiva: conserva su configuración e historial, pero no recibe equipo nuevo hasta reactivarla.</Alert> : null}

      <nav aria-label="Apartados de la iglesia" className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface p-1 shadow-sm [scrollbar-width:none]">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/iglesias/${c.id}?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:bg-surface-2 hover:text-foreground"}`}
          >
            <t.icon aria-hidden className="size-4" /> {t.label}
          </Link>
        ))}
      </nav>

      <div key={tab} className="page-enter flex flex-col gap-6">
        {tab === "resumen" ? <SummaryTab d={d} /> : null}
        {tab === "identidad" ? (
          can(actor, "churches:update") ? (
            <ChurchProfileForm church={c} />
          ) : (
            <Alert>No tienes permiso para modificar la configuración de esta iglesia.</Alert>
          )
        ) : null}
        {tab === "equipo" ? <TeamTab d={d} actor={actor} /> : null}
        {tab === "historial" && d.history ? <HistoryTab history={d.history} /> : null}
        {tab === "gestion" && can(actor, "churches:update") ? <ManageTab d={d} /> : null}
      </div>
    </div>
  );
}

function SummaryTab({ d }: { d: Detail }) {
  const c = d.church;
  const p = c.profile;
  const groups = [...new Set(d.readiness.checks.map((k) => k.group))];
  return (
    <>
      <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Equipo" value={d.team.length} detail="Personas vinculadas a la sede" icon={<UsersRound className="size-4" />} />
        <StatCard label="Roles asignados" value={d.team.reduce((s, t) => s + t.roles.length, 0)} detail="Dentro de esta sede" icon={<Crown className="size-4" />} />
        <StatCard label="Sedes de la franquicia" value={c.franchise._count.churches} detail={c.franchise.name} icon={<Palette className="size-4" />} />
        <StatCard label="Puntos pendientes" value={d.readiness.total - d.readiness.done} detail="Para estar lista al 100 %" icon={<Settings2 className="size-4" />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Lista de preparación" description="Lo que necesita la sede para operar por completo.">
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{g}</p>
                <ul className="stagger flex flex-col gap-1.5">
                  {d.readiness.checks.filter((k) => k.group === g).map((k) => (
                    <li key={k.key} className={`flex items-center gap-2 text-sm ${k.done ? "" : "text-muted"}`}>
                      {k.done ? <CheckCircle2 aria-hidden className="size-4 text-success" /> : <Circle aria-hidden className="size-4" />}
                      {k.label}
                      <span className="sr-only">{k.done ? "(listo)" : "(pendiente)"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {d.readiness.percent < 100 ? (
            <Link href={`/admin/iglesias/${c.id}?tab=${d.team.length ? "identidad" : "equipo"}`} className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
              Completar lo pendiente →
            </Link>
          ) : null}
        </Card>
        <Card title="Contacto y presentación">
          <ul className="flex flex-col gap-3 text-sm">
            <li className="flex items-start gap-3"><MapPin aria-hidden className="mt-0.5 size-4 text-accent" />{p?.address ?? <span className="text-muted">Sin dirección</span>}</li>
            <li className="flex items-center gap-3"><Phone aria-hidden className="size-4 text-accent" />{p?.phone ?? <span className="text-muted">Sin teléfono</span>}</li>
            <li className="flex items-center gap-3"><Mail aria-hidden className="size-4 text-accent" />{p?.email ?? <span className="text-muted">Sin correo</span>}</li>
            {p?.scheduleText ? <li className="whitespace-pre-line rounded-xl bg-surface-2 p-3"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">Horarios</span>{p.scheduleText}</li> : null}
            {p?.aboutText ? <li className="whitespace-pre-line text-muted">{p.aboutText}</li> : null}
          </ul>
          {p?.updatedBy ? <p className="mt-4 text-xs text-muted">Última edición por {p.updatedBy.name} el {formatDate(p.updatedAt)}.</p> : null}
        </Card>
      </div>
    </>
  );
}

async function TeamTab({ d, actor }: { d: Detail; actor: Actor }) {
  const manage = can(actor, "churches:manage_members");
  const options = manage && d.church.isActive ? await churchTeamOptions(actor, d.church.id) : null;
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card title="Equipo de la sede" description="Personas vinculadas y su rol dentro de esta iglesia.">
        {d.team.length === 0 ? (
          <EmptyState title="Sin equipo asignado" description="Asigna al menos un responsable para que la sede pueda operar." />
        ) : (
          <ul className="stagger flex flex-col divide-y divide-border">
            {d.team.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                <span aria-hidden className="grid size-10 place-items-center rounded-full bg-accent-soft font-semibold text-accent">{t.name.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {t.name}
                    {t.isPrimary ? <Badge tone="accent">Sede principal</Badge> : null}
                    {t.isActive ? null : <Badge>Usuario inactivo</Badge>}
                  </span>
                  <span className="block truncate text-sm text-muted">{t.email} · desde {formatDate(t.since)}</span>
                  {t.roles.length ? (
                    <span className="mt-1 flex flex-wrap gap-1">{t.roles.map((r) => <Badge key={r.id} tone="info">{r.name}</Badge>)}</span>
                  ) : null}
                </span>
                {manage && t.id !== actor.userId ? (
                  <ActionButton action={removeChurchTeamAction.bind(null, d.church.id, t.id)} confirmMessage={`¿Retirar a ${t.name} del equipo de esta sede?`}>
                    Retirar
                  </ActionButton>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {options ? (
        <Card title="Agregar al equipo" description="Solo puedes asignar roles de tu nivel o inferior, y nunca a ti mismo.">
          {options.users.length === 0 ? (
            <p className="text-sm text-muted">No hay más usuarios activos disponibles para esta sede.</p>
          ) : (
            <ActionForm action={addChurchTeamAction.bind(null, d.church.id)}>
              <SelectField label="Usuario" name="userId" required placeholder="Elige un usuario" options={options.users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))} />
              <SelectField label="Rol en la sede (opcional)" name="roleId" placeholder="Sin rol específico" options={options.roles.map((r) => ({ value: r.id, label: r.name }))} />
              <CheckboxField label="Es su sede principal" name="isPrimary" hint="Una persona solo puede tener una sede principal." />
              <SubmitButton>Agregar al equipo</SubmitButton>
            </ActionForm>
          )}
        </Card>
      ) : null}
    </div>
  );
}

function HistoryTab({ history }: { history: NonNullable<Detail["history"]> }) {
  return (
    <Card title="Historial de la iglesia" description="Altas, cambios de configuración, equipo y estado, con quién y cuándo.">
      {history.length === 0 ? (
        <EmptyState title="Sin registros" />
      ) : (
        <ol className="stagger relative flex flex-col gap-3 border-l-2 border-border pl-5">
          {history.map((h) => {
            const meta = (h.metadata ?? {}) as Record<string, unknown>;
            return (
              <li key={h.id} className="relative">
                <span aria-hidden className="absolute -left-[27px] top-1.5 size-3 rounded-full bg-accent ring-4 ring-surface" />
                <p className="text-sm"><span className="font-medium">{h.actor?.name ?? "Sistema"}</span> <span className="text-muted">{describeAction(h.action)} la iglesia</span></p>
                <p className="text-xs text-muted">
                  {formatDateTime(h.createdAt)}
                  {typeof meta.role === "string" ? ` · Rol: ${meta.role}` : ""}
                  {typeof meta.reason === "string" ? ` · Motivo: ${meta.reason}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function ManageTab({ d }: { d: Detail }) {
  const c = d.church;
  return (
    <div className="grid max-w-3xl gap-6">
      <Card title="Estado de la iglesia" description="Desactivar no borra nada: se conservan su configuración, equipo e historial.">
        {c.isActive ? (
          <ActionForm action={setChurchStatusAction.bind(null, c.id, false)} confirmMessage={`¿Desactivar ${c.name}?`}>
            <TextArea label="Motivo de la desactivación" name="reason" rows={2} required />
            <SubmitButton variant="danger">Desactivar iglesia</SubmitButton>
          </ActionForm>
        ) : (
          <ActionForm action={setChurchStatusAction.bind(null, c.id, true)}>
            <p className="text-sm text-muted">La iglesia está inactiva. Al reactivarla podrá volver a recibir equipo.</p>
            <SubmitButton>Reactivar iglesia</SubmitButton>
          </ActionForm>
        )}
      </Card>
    </div>
  );
}
