"use client"

import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { StatusDot } from "@/components/ui/status-dot"
import { Banknote, Smartphone, NotebookTabs, Split } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSettings } from "@/hooks/use-settings"
import { formatCurrency } from "@/lib/format-currency"
import { getStatusInfo } from "./transaction-utils"
import type { Transaction } from "@/hooks/use-transactions"

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  Cash: <Banknote className="h-3.5 w-3.5" />,
  GCash: <Smartphone className="h-3.5 w-3.5" />,
  Tab: <NotebookTabs className="h-3.5 w-3.5" />,
  Split: <Split className="h-3.5 w-3.5" />,
}

interface TransactionCardProps {
  transaction: Transaction
  onSelect: (transaction: Transaction) => void
}

export function TransactionCard({ transaction: tx, onSelect }: TransactionCardProps) {
  const { currencySymbol } = useSettings()
  const fmt = (value: string | number | null | undefined) =>
    formatCurrency(value, currencySymbol)

  const statusInfo = getStatusInfo(tx)
  const isPending = tx.paymentStatus === "pending" && !tx.isVoided
  const paymentIcon = PAYMENT_ICONS[tx.paymentType] || null

  return (
    <Card
      className={cn(
        "py-3 gap-2 cursor-pointer hover:bg-accent/50 transition-colors active:bg-accent",
        tx.isVoided && "opacity-60",
        isPending && "border-status-warning/50"
      )}
      onClick={() => onSelect(tx)}
    >
      <CardContent className="px-4 py-0">
        {/* Row 1: Order# + Badge + Total */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono tabular-nums font-semibold">#{tx.orderNumber}</span>
            <StatusDot variant={statusInfo.variant} label={statusInfo.label} />
          </div>
          <span
            className={cn(
              "font-mono tabular-nums font-semibold",
              tx.isVoided && "line-through text-muted-foreground"
            )}
          >
            {fmt(tx.total)}
          </span>
        </div>

        {/* Row 2: Payment icon + method · items · customer + time */}
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate max-w-[65%]">
            {paymentIcon}
            <span>{tx.paymentType}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>{tx.items.length} items</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="truncate">{tx.customer?.name || "Walk-in"}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(tx.createdAt), "h:mm a")}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
