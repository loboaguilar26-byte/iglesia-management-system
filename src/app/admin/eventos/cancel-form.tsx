"use client";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";
import { cancelEventAction } from "./actions";
export function CancelEventForm({ id }: { id: string }) { const [state, action, pending] = useActionState<ActionState, FormData>(cancelEventAction.bind(null, id), {}); return <form action={action} className="flex flex-col gap-3"><input name="reason" required minLength={3} placeholder="Motivo de cancelación" className="min-h-11 rounded-lg border border-border px-3" />{state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}<Button type="submit" variant="danger" disabled={pending}>{pending ? "Cancelando…" : "Cancelar evento"}</Button></form>; }
