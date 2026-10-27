import type { Metadata } from "next";
import { HeartHandshake, Lock, MessageCircleHeart, UsersRound } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { CheckboxField, Field, TextArea } from "@/components/ui/field";
import { Badge, Card, EmptyState } from "@/components/ui/layout";
import { formatDate } from "@/lib/dates";
import { requirePortalActor } from "@/lib/session";
import { myPrayerRequests, PRAYER_STATUS_LABEL } from "@/modules/portal/engagement";
import { getChurchTimezone } from "@/modules/settings/service";
import { closePrayerAction, createPrayerAction } from "../actions";
import { PortalHeading, portalBlocker } from "../portal-ui";

export const metadata: Metadata = { title: "Peticiones de oración" };

const TONE = { OPEN: "info", PRAYING: "accent", ANSWERED: "success", CLOSED: "neutral" } as const;

export default async function PrayerPage() {
  const actor = await requirePortalActor();
  const blocked = portalBlocker(actor);
  if (blocked) return blocked;
  const [requests, tz] = await Promise.all([myPrayerRequests(actor), getChurchTimezone()]);
  const answered = requests.filter((r) => r.status === "ANSWERED").length;

  return (
    <div className="flex flex-col gap-6">
      <PortalHeading
        eyebrow="Oración"
        title="Peticiones de oración"
        description="Comparte con el equipo pastoral aquello por lo que necesitas oración. Solo ellos pueden leerlo."
        actions={answered ? <Badge tone="success">{answered} respondidas</Badge> : undefined}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card title="Nueva petición">
          <ActionForm action={createPrayerAction}>
            <Field label="Asunto" name="subject" required maxLength={120} placeholder="Ej. Salud de mi mamá" />
            <TextArea label="Petición" name="body" required rows={5} maxLength={2000} />
            <CheckboxField
              label="Puede compartirse con el equipo de oración"
              name="shareWithTeam"
              hint="Si no lo marcas, solo el equipo pastoral la verá. Nunca se comparten tus datos de contacto."
            />
            <SubmitButton>Enviar petición</SubmitButton>
          </ActionForm>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-xs text-muted">
            <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent" />
            Tu petición es un dato sensible: no se publica y la bitácora no guarda su contenido.
          </p>
        </Card>

        <Card title="Mis peticiones">
          {requests.length === 0 ? (
            <EmptyState title="Aún no has enviado peticiones" description="Cuando lo hagas podrás seguir su estado aquí." />
          ) : (
            <ul className="stagger flex flex-col gap-3">
              {requests.map((r) => {
                const open = r.status === "OPEN" || r.status === "PRAYING";
                return (
                  <li key={r.id} className={`rounded-2xl border p-4 ${r.status === "ANSWERED" ? "border-success/40 bg-success/5" : "border-border"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold">{r.subject}</p>
                      <Badge tone={TONE[r.status]}>{PRAYER_STATUS_LABEL[r.status]}</Badge>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted">{r.body}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                      {r.isConfidential ? <Lock aria-hidden className="size-3" /> : <UsersRound aria-hidden className="size-3" />}
                      {r.isConfidential ? "Solo equipo pastoral" : "Compartida con el equipo de oración"} · {formatDate(r.createdAt, tz)}
                    </p>
                    {r.pastoralNote ? (
                      <p className="mt-3 flex items-start gap-2 rounded-xl bg-accent-soft/60 p-3 text-sm">
                        <MessageCircleHeart aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
                        {r.pastoralNote}
                      </p>
                    ) : null}
                    {open ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ActionButton action={closePrayerAction.bind(null, r.id, true)} variant="primary">
                          <HeartHandshake aria-hidden className="size-4" /> Dios respondió
                        </ActionButton>
                        <ActionButton action={closePrayerAction.bind(null, r.id, false)} variant="ghost" confirmMessage="¿Cerrar esta petición?">Cerrar</ActionButton>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
