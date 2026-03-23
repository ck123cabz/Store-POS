import { format } from "date-fns"
import { formatCurrency } from "@/lib/format-currency"
import type { Transaction } from "@/hooks/use-transactions"

const HEADERS = ["Order #", "Date", "Time", "Customer", "Items", "Payment", "Total", "Status"]

/**
 * Escape a CSV field value.
 * Wraps in double quotes if it contains comma, quote, or newline.
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Get display status string for a transaction.
 */
function getStatus(tx: Transaction): string {
  if (tx.isVoided) return "VOIDED"
  if (tx.paymentStatus === "cancelled") return "Cancelled"
  if (tx.paymentStatus === "pending") return "Pending"
  if (tx.status === 1 && tx.paymentType === "Tab") return "On Tab"
  if (tx.status === 1) return "Completed"
  if (tx.refNumber) return "On Hold"
  return "Pending"
}

/**
 * Generate CSV string from a list of transactions.
 *
 * @param transactions - Array of transactions to export
 * @param currencySymbol - Currency symbol (e.g., "₱", "$")
 * @returns CSV string with headers and data rows
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  currencySymbol: string
): string {
  const rows = [HEADERS.join(",")]

  for (const tx of transactions) {
    const date = new Date(tx.createdAt)
    const row = [
      tx.orderNumber.toString(),
      format(date, "yyyy-MM-dd"),
      format(date, "h:mm a"),
      escapeCSV(tx.customer?.name || "Walk-in"),
      tx.items.length.toString(),
      tx.paymentType || "-",
      formatCurrency(tx.total, currencySymbol),
      getStatus(tx),
    ]
    rows.push(row.join(","))
  }

  return rows.join("\n")
}

/**
 * Trigger a browser download of the CSV content.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
