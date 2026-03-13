import { prisma } from "@/lib/prisma"

type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "void"
  | "cancel"
  | "confirm"
  | "restock"
  | "produce"
  | "reorder"
  | "settle_tab"
  | "inventory_count"
  | "status_change"

interface AuditEntry {
  entity: string
  entityId?: number | null
  action: AuditAction
  changes?: Record<string, { old: unknown; new: unknown }> | null
  summary: string
  userId?: number | null
  userName?: string | null
}

/**
 * Log an action to the general audit trail.
 * Fire-and-forget — errors are swallowed so they never break the calling route.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        action: entry.action,
        changes: (entry.changes ?? undefined) as never,
        summary: entry.summary,
        userId: entry.userId ?? null,
        userName: entry.userName ?? null,
      },
    })
  } catch (error) {
    console.error("[audit] Failed to write audit log:", error)
  }
}

/**
 * Build a changes diff object from old and new values.
 * Only includes fields that actually changed.
 */
export function diffChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> | null {
  const diff: Record<string, { old: unknown; new: unknown }> = {}
  for (const key of Object.keys(newObj)) {
    const oldVal = oldObj[key]
    const newVal = newObj[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { old: oldVal, new: newVal }
    }
  }
  return Object.keys(diff).length > 0 ? diff : null
}

/**
 * Extract user info from a NextAuth session for audit logging.
 */
export function auditUser(session: { user?: { id?: number | string; name?: string | null; username?: string } } | null) {
  const rawId = session?.user?.id
  return {
    userId: rawId != null ? (typeof rawId === "string" ? parseInt(rawId, 10) : rawId) : null,
    userName: session?.user?.name ?? session?.user?.username ?? null,
  }
}
