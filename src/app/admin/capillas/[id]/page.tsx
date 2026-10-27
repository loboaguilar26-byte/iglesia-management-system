import type { Metadata } from "next";
import { CalendarDays, ClipboardCheck, HandHeart, Mail, MapPin, Phone, UserPlus, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart } from "@/components/bar-chart";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Alert } from "@/components/ui/alert";
import { TextArea } from "@/components/ui/field";
import { Badge, Card, EmptyState, PageHeader, ResponsiveTable, StatCard } from "@/components/ui/layout";
import { Pagination } from "@/components/ui/pagination";
import { can } from "@/lib/authz";
import { formatDateOnly, formatDateTime, formatLongDate, formatTime } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import { requirePageActor } from "@/lib/session";
import { describeAction } from "@/modules/audit/service";
import { CHAPEL_STATUS_LABEL, chapelDonations, chapelPeople, getChapelOverview, managerUserOptions } from "@/modules/chapels/service";
import { MEMBER_STATUS_LABEL } from "@/modules/members/schema";
import { getChurchTimezone, getSettingsInternal } from "@/modules/settings/service";
import { setChapelStatusAction, updateChapelAction } from "../actions";
import { ChapelForm } from "../chapel-form";

export const metadata: Metadata = { title: "Capilla" };

const TONE = { ACTIVE: "success", INACTIVE: "warning", ARCHIVED: "neutral" } as const;

export default async function ChapelPage({ params, searchParams }: PageProps<"/admin/capillas/[id]">) {
  const actor = await requirePageActor();
  if (!can(actor, "chapels:read")) notFound();
  const { id } = await params;
  const sp = await searchParams;
  const [o, tz, settings] = await Promise.all([
    getChapelOverview(actor, id).catch((e) => {
      if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
      throw e;
    }),
    getChurchTimezone(),
    getSettingsInternal(),
  ]);
  const c = o.chapel;
  const tabs = [
    { key: "resumen", label: "Resumen", show: true },
    { key: "personas", label: "Personas", show: can(actor, "members:read") },
    { key: "ingresos", label: "Ingresos", show: can(actor, "finance:read") },
    { key: "historial", label: "Historial", show: !!o.history },
    { key: "gestion", label: "Gestión", show: can(actor, "chapels:manage") },
  ].filter((t) => t.show);
  const tab = tabs.some((t) => t.key === sp.tab) ? String(sp.tab) : "resumen";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={c.name}
        back={{ href: "/admin/capillas", label: "Capillas" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs">{c.code}</span>
            <Badge tone={TONE[c.status]}>{CHAPEL_STATUS_LABEL[c.status]}</Badge>
            {c.openedOn ? <span>Abierta desde {formatDateOnly(c.openedOn)}</span> : null}
          </span>
        }
      />
      {sp.creada === "1" ? <Alert tone="success">Capilla dada de alta. Ahora puedes asignarle personas, ministerios, eventos y aportaciones.</Alert> : null}
      {c.status === "ARCHIVED" ? <Alert tone="info">Capilla archivada{c.archivedAt ? ` el ${formatDateTime(c.archivedAt, tz)}` : ""}. Motivo: {c.statusReason}. Su historial se conserva; no se le pueden asignar registros nuevos.</Alert> : null}
      {c.status === "INACTIVE" ? <Alert tone="info">Capilla inactiva{c.statusReason ? `: ${c.statusReason}` : ""}. No recibe registros nuevos hasta reactivarla.</Alert> : null}

      <nav aria-label="Secciones de la capilla" className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/capillas/${c.id}?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:bg-surface-2 hover:text-foreground"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "resumen" ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Miembros activos" value={o.members.ACTIVE} detail={`${o.members.VISITOR} visitantes · ${o.members.INACTIVE} inactivos`} icon={<Users className="size-4" />} />
            <StatCard label="Asistencias (30 días)" value={o.attendance30} detail={`+${o.visitors30} visitantes sin ficha`} icon={<ClipboardCheck className="size-4" />} />
            <StatCard label="Ministerios" value={o.ministries.filter((m) => m.isActive).length} detail="Activos en la capilla" icon={<HandHeart className="size-4" />} />
            {o.finance ? <StatCard label="Ingresos del mes" value={formatMoney(o.finance.monthTotal, settings.currency)} detail={`Año: ${formatMoney(o.finance.yearTotal, settings.currency)}`} icon={<Wallet className="size-4" />} /> : <StatCard label="Próximos eventos" value={o.upcoming.length} detail="Programados" icon={<CalendarDays className="size-4" />} />}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Datos de la capilla">
              <ul className="flex flex-col gap-3 text-sm">
                <li className="flex items-start gap-3"><UserPlus aria-hidden className="mt-0.5 size-4 text-accent" /><span>Encargado: {c.managerMember ? <Link className="font-medium text-primary hover:underline" href={`/admin/miembros/${c.managerMember.id}`}>{c.managerMember.firstName} {c.managerMember.lastName}</Link> : <span className="text-muted">sin asignar</span>}{c.managerUser ? <span className="text-muted"> · cuenta: {c.managerUser.name}</span> : null}</span></li>
                {c.address ? <li className="flex items-start gap-3"><MapPin aria-hidden className="mt-0.5 size-4 text-accent" />{c.address}</li> : null}
                {c.phone ? <li className="flex items-center gap-3"><Phone aria-hidden className="size-4 text-accent" />{c.phone}</li> : null}
                {c.email ? <li className="flex items-center gap-3"><Mail aria-hidden className="size-4 text-accent" />{c.email}</li> : null}
                {c.description ? <li className="whitespace-pre-line text-muted">{c.description}</li> : null}
              </ul>
            </Card>
            <Card title="Próximos eventos">
              {o.upcoming.length === 0 ? (
                <EmptyState title="Sin eventos próximos" description="Al crear un evento, elige esta capilla." />
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {o.upcoming.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                      <Link href={`/admin/eventos/${e.id}`} className="min-w-0 truncate font-medium hover:text-primary">{e.title}</Link>
                      <span className="shrink-0 text-sm text-muted">{formatLongDate(e.startsAt, tz)} · {formatTime(e.startsAt, tz)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Ministerios de la capilla">
              {o.ministries.length === 0 ? (
                <EmptyState title="Sin ministerios" description="Asigna la capilla al editar un ministerio." />
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {o.ministries.map((m) => (
                    <li key={m.id}>
                      <Link href={`/admin/ministerios/${m.id}`} className="lift inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm">
                        {m.name} <span className="rounded-full bg-surface-2 px-2 text-xs text-muted">{m._count.memberships}</span>
                        {m.isActive ? null : <Badge>Inactivo</Badge>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {o.finance ? (
              <Card title="Ingresos por mes" description="Aportaciones vigentes registradas a esta capilla, últimos 6 meses.">
                <BarChart label="Ingresos de la capilla" color="var(--accent)" format={(v) => formatMoney(v, settings.currency)} data={o.finance.monthly.map((m) => ({ label: m.label, value: Number(m.total) }))} />
              </Card>
            ) : null}
          </div>
        </>
      ) : null}

      {tab === "personas" ? <PeopleTab id={c.id} page={Number(sp.page) || 1} /> : null}
      {tab === "ingresos" ? <DonationsTab id={c.id} currency={settings.currency} /> : null}

      {tab === "historial" && o.history ? (
        <Card title="Historial de la capilla" description="Altas, cambios, bajas y archivo, con quién y cuándo.">
          {o.history.length === 0 ? (
            <EmptyState title="Sin registros" />
          ) : (
            <ol className="relative flex flex-col gap-3 border-l-2 border-border pl-5">
              {o.history.map((h) => {
                const meta = (h.metadata ?? {}) as Record<string, unknown>;
                return (
                  <li key={h.id} className="relative">
                    <span aria-hidden className="absolute -left-[27px] top-1.5 size-3 rounded-full bg-accent ring-4 ring-surface" />
                    <p className="text-sm"><span className="font-medium">{h.actor?.name ?? "Sistema"}</span> <span className="text-muted">{describeAction(h.action)} la capilla</span></p>
                    <p className="text-xs text-muted">{formatDateTime(h.createdAt, tz)}{typeof meta.reason === "string" ? ` · Motivo: ${meta.reason}` : ""}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      ) : null}

      {tab === "gestion" && can(actor, "chapels:manage") ? <ManageTab chapel={c} /> : null}
    </div>
  );
}

async function PeopleTab({ id, page }: { id: string; page: number }) {
  const actor = await requirePageActor();
  const { data, meta } = await chapelPeople(actor, id, page);
  return (
    <div className="flex flex-col gap-4">
      {data.length === 0 ? (
        <EmptyState title="Sin personas asignadas" description="Asigna la capilla desde la ficha de cada persona." />
      ) : (
        <ResponsiveTable
          rows={data}
          rowKey={(m) => m.id}
          columns={[
            { header: "Nombre", cell: (m) => <Link className="font-medium text-primary hover:underline" href={`/admin/miembros/${m.id}`}>{m.lastName}, {m.firstName}</Link> },
            { header: "Estado", cell: (m) => <Badge tone={m.status === "ACTIVE" ? "success" : m.status === "VISITOR" ? "accent" : "neutral"}>{MEMBER_STATUS_LABEL[m.status]}</Badge> },
            { header: "Teléfono", cell: (m) => m.phone ?? "—" },
            { header: "Ingreso", cell: (m) => (m.joinDate ? formatDateOnly(m.joinDate) : "—") },
          ]}
        />
      )}
      <Pagination {...meta} hrefFor={(p) => `/admin/capillas/${id}?tab=personas&page=${p}`} />
    </div>
  );
}

async function DonationsTab({ id, currency }: { id: string; currency: string }) {
  const actor = await requirePageActor();
  const rows = await chapelDonations(actor, id);
  return rows.length === 0 ? (
    <EmptyState title="Sin aportaciones registradas en esta capilla" description="Al registrar una aportación en Tesorería, elige esta capilla." />
  ) : (
    <ResponsiveTable
      rows={rows}
      rowKey={(d) => d.id}
      columns={[
        { header: "Monto", cell: (d) => <Link href={`/admin/tesoreria/${d.id}`} className={`font-semibold tabular-nums text-primary hover:underline ${d.status === "VOIDED" ? "line-through opacity-60" : ""}`}>{formatMoney(d.amount.toString(), currency)}</Link> },
        { header: "Fecha", cell: (d) => formatDateOnly(d.receivedAt) },
        { header: "Concepto", cell: (d) => d.concept.name },
        { header: "Método", cell: (d) => d.method.name },
        { header: "Estado", cell: (d) => (d.status === "VOIDED" ? <Badge tone="danger">Anulada</Badge> : <Badge tone="success">Vigente</Badge>) },
      ]}
    />
  );
}

async function ManageTab({ chapel }: { chapel: Awaited<ReturnType<typeof getChapelOverview>>["chapel"] }) {
  const actor = await requirePageActor();
  const users = await managerUserOptions(actor);
  const archived = chapel.status === "ARCHIVED";
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card title="Editar datos">
        {archived ? (
          <p className="text-sm text-muted">Restaura la capilla para editar sus datos.</p>
        ) : (
          <ChapelForm
            action={updateChapelAction.bind(null, chapel.id)}
            users={users}
            values={{
              ...chapel,
              managerMember: chapel.managerMember ? { id: chapel.managerMember.id, name: `${chapel.managerMember.firstName} ${chapel.managerMember.lastName}` } : null,
            }}
            submitLabel="Guardar cambios"
          />
        )}
      </Card>
      <div className="flex flex-col gap-6">
        <Card title="Estado" description="Dar de alta, de baja temporal o archivar. Nada se borra.">
          <div className="flex flex-col gap-4">
            {chapel.status !== "ACTIVE" ? (
              <ActionForm action={setChapelStatusAction.bind(null, chapel.id)}>
                <input type="hidden" name="status" value="ACTIVE" />
                <SubmitButton>{archived ? "Restaurar y activar" : "Reactivar capilla"}</SubmitButton>
              </ActionForm>
            ) : null}
            {chapel.status === "ACTIVE" ? (
              <ActionForm action={setChapelStatusAction.bind(null, chapel.id)} confirmMessage="¿Dar de baja temporal esta capilla?">
                <input type="hidden" name="status" value="INACTIVE" />
                <TextArea label="Motivo de la baja (opcional)" name="reason" rows={2} />
                <SubmitButton variant="secondary">Dar de baja temporal</SubmitButton>
              </ActionForm>
            ) : null}
            {!archived ? (
              <ActionForm action={setChapelStatusAction.bind(null, chapel.id)} confirmMessage="¿Archivar la capilla? Se conserva todo su historial, pero ya no recibirá registros nuevos.">
                <input type="hidden" name="status" value="ARCHIVED" />
                <TextArea label="Motivo del archivo" name="reason" rows={2} required />
                <SubmitButton variant="danger">Archivar capilla</SubmitButton>
              </ActionForm>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
