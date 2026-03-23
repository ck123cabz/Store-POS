"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useSettings } from "@/hooks/use-settings"
import { exportTransactionsToCSV, downloadCSV } from "@/lib/export-transactions"
import type { Transaction, TransactionFilters, QuickFilter } from "@/hooks/use-transactions"

interface TransactionExportProps {
  transactions: Transaction[]
  filters: TransactionFilters
  activeQuickFilter: QuickFilter | null
}

export function TransactionExport({
  transactions,
  filters,
  activeQuickFilter,
}: TransactionExportProps) {
  const { currencySymbol } = useSettings()

  function handleExport() {
    const csv = exportTransactionsToCSV(transactions, currencySymbol)

    // Build filename from active filter context
    let dateLabel = "all"
    if (activeQuickFilter && activeQuickFilter !== "All") {
      dateLabel = activeQuickFilter.toLowerCase().replace(/\s+/g, "-")
    } else if (filters.dateFrom && filters.dateTo) {
      dateLabel = `${filters.dateFrom}_${filters.dateTo}`
    } else if (filters.dateFrom) {
      dateLabel = `from-${filters.dateFrom}`
    }

    downloadCSV(csv, `transactions-${dateLabel}.csv`)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={transactions.length === 0}
    >
      <Download className="h-4 w-4 mr-2" />
      Export
    </Button>
  )
}
