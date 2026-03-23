"use client"

import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { StatusDot } from "@/components/ui/status-dot"
import { ReceiptText, Banknote, Smartphone, NotebookTabs, Split } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSettings } from "@/hooks/use-settings"
import { formatCurrency } from "@/lib/format-currency"
import { getStatusInfo, formatPaymentDisplay } from "./transaction-utils"
import type { Transaction, TransactionFilters, QuickFilter } from "@/hooks/use-transactions"

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  Cash: <Banknote className="h-3.5 w-3.5 text-muted-foreground" />,
  GCash: <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />,
  Tab: <NotebookTabs className="h-3.5 w-3.5 text-muted-foreground" />,
  Split: <Split className="h-3.5 w-3.5 text-muted-foreground" />,
}

interface TransactionTableProps {
  transactions: Transaction[]
  onSelect: (transaction: Transaction) => void
  isLoading: boolean
  activeQuickFilter: QuickFilter | null
  filters: TransactionFilters
  onClearFilters: () => void
}

export function TransactionTable({
  transactions,
  onSelect,
  isLoading,
  activeQuickFilter,
  filters,
  onClearFilters,
}: TransactionTableProps) {
  const { currencySymbol } = useSettings()
  const fmt = (value: string | number | null | undefined) =>
    formatCurrency(value, currencySymbol)

  const hasActiveFilters =
    !!activeQuickFilter ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    !!filters.status ||
    !!filters.userId ||
    !!filters.tillNumber

  const columns: DataTableColumn<Transaction>[] = [
    {
      id: "orderNumber",
      header: "Order #",
      cell: (tx) => (
        <span className="font-mono tabular-nums">{tx.orderNumber}</span>
      ),
      priority: 0,
      sortable: true,
    },
    {
      id: "time",
      header: "Time",
      cell: (tx) => (
        <div>
          <div>{format(new Date(tx.createdAt), "MMM d, h:mm a")}</div>
          {tx.isVoided && tx.voidedAt && (
            <div className="text-xs text-destructive">
              Voided: {format(new Date(tx.voidedAt), "MMM d, h:mm a")}
            </div>
          )}
        </div>
      ),
      priority: 1,
      sortable: true,
    },
    {
      id: "customer",
      header: "Customer",
      cell: (tx) => (
        <span className={cn(!tx.customer && "italic text-muted-foreground")}>
          {tx.customer?.name || "Walk-in"}
        </span>
      ),
      priority: 2,
    },
    {
      id: "items",
      header: "Items",
      cell: (tx) => tx.items.length,
      priority: 2,
      align: "center",
    },
    {
      id: "payment",
      header: "Payment",
      cell: (tx) => {
        const payment = formatPaymentDisplay(tx, fmt)
        const icon = PAYMENT_ICONS[tx.paymentType] || null
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              {icon}
              <span>{payment.label}</span>
              {payment.status === "pending" && (
                <Badge variant="outline" className="text-status-warning border-status-warning/30 text-[10px] px-1 py-0">
                  Pending
                </Badge>
              )}
            </div>
            {payment.detail && (
              <div className="text-xs text-muted-foreground">{payment.detail}</div>
            )}
          </div>
        )
      },
      priority: 1,
    },
    {
      id: "total",
      header: "Total",
      cell: (tx) => (
        <span
          className={cn(
            "font-mono tabular-nums",
            tx.isVoided && "line-through text-muted-foreground"
          )}
          data-testid="transaction-total"
        >
          {fmt(tx.total)}
        </span>
      ),
      priority: 0,
      align: "right",
      sortable: true,
    },
    {
      id: "status",
      header: "Status",
      cell: (tx) => {
        const info = getStatusInfo(tx)
        return <StatusDot variant={info.variant} label={info.label} />
      },
      priority: 0,
      align: "center",
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={transactions}
      rowKey={(tx) => tx.id}
      onRowClick={onSelect}
      loading={isLoading}
      pageSize={15}
      emptyIcon={<ReceiptText className="size-10" />}
      emptyTitle="No transactions yet"
      emptyDescription={
        hasActiveFilters
          ? "No transactions match your filters."
          : "Your first sale is going to feel great."
      }
      emptyAction={
        hasActiveFilters ? (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : (
          <Button size="sm" asChild>
            <Link href="/pos">Go to POS</Link>
          </Button>
        )
      }
    />
  )
}
