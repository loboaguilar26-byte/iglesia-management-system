import type { Actor } from "./authz";
import type { Db, Tx } from "./db";

type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string | null;
  /** Nunca incluir contraseñas, tokens ni secretos. */
  metadata?: Record<string, unknown>;
};

const FORBIDDEN_KEYS = /pass|token|secret/i;

function sanitize(metadata: Record<string, unknown> = {}) {
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !FORBIDDEN_KEYS.test(key)));
}

export async function recordAudit(client: Db | Tx, actor: Actor | null, entry: AuditEntry) {
  await client.auditLog.create({
    data: {
      actorId: actor?.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      metadata: sanitize(entry.metadata) as object,
      ipAddress: actor?.ipAddress ?? null,
    },
  });
}
