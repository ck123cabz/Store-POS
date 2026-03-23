import type { Transaction } from "@/hooks/use-transactions"

/**
 * Get status variant and label for a transaction.
 * Used by table, cards, and detail views for consistent status display.
 */
export function getStatusInfo(tx: Transaction): {
  variant: "ok" | "warning" | "critical" | "info"
  label: string
} {
  if (tx.isVoided) return { variant: "critical", label: "Voided" }
  if (tx.paymentStatus === "cancelled") return { variant: "critical", label: "Cancelled" }
  if (tx.paymentStatus === "pending") return { variant: "warning", label: "GCash Pending" }
  if (tx.status === 1 && tx.paymentType === "Tab") return { variant: "info", label: "On Tab" }
  if (tx.status === 1) return { variant: "ok", label: "Completed" }
  if (tx.refNumber) return { variant: "info", label: "On Hold" }
  return { variant: "warning", label: "Pending" }
}

/**
 * Format payment display with details.
 * Shared between table and card views.
 */
export function formatPaymentDisplay(
  tx: Transaction,
  fmtCurrency: (value: string | number | null | undefined) => string
): { label: string; detail?: string; status?: "pending" | "confirmed" } {
  if (!tx.paymentType) return { label: "-" }

  switch (tx.paymentType) {
    case "Cash": {
      const change = parseFloat(tx.changeAmount || "0")
      if (change > 0) {
        return { label: "Cash", detail: `Change: ${fmtCurrency(change)}` }
      }
      return { label: "Cash" }
    }
    case "GCash": {
      const isPending = tx.paymentStatus === "pending"
      return {
        label: "GCash",
        detail: tx.paymentInfo ? `Ref: ${tx.paymentInfo.slice(0, 10)}...` : undefined,
        status: isPending ? "pending" : "confirmed",
      }
    }
    case "Tab":
      return { label: "Tab", detail: tx.customer?.name }
    case "Split": {
      try {
        const splitData = JSON.parse(tx.paymentInfo || "{}")
        const components = splitData.components || []
        const methods = components
          .map((c: { method: string }) => c.method)
          .join("+")
        return { label: "Split", detail: methods || undefined }
      } catch {
        return { label: "Split" }
      }
    }
    default:
      return { label: tx.paymentType }
  }
}
