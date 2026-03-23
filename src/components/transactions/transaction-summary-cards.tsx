"use client"

import { useIsMobile } from "@/hooks/use-mobile"
import { useSettings } from "@/hooks/use-settings"
import { formatCurrency } from "@/lib/format-currency"
import { SummaryCard, SummaryCardGrid } from "@/components/ui/summary-card"
import type { TodayData } from "@/hooks/use-transactions"

interface TransactionSummaryCardsProps {
  todayData: TodayData | null
  isLoading: boolean
}

export function TransactionSummaryCards({ todayData, isLoading }: TransactionSummaryCardsProps) {
  const isMobile = useIsMobile()
  const { currencySymbol } = useSettings()

  const fmt = (value: number | string | null | undefined) =>
    formatCurrency(value, currencySymbol)

  if (!todayData && !isLoading) return null

  // Mobile: compact 3-metric horizontal strip
  if (isMobile) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-card p-3 text-card-foreground">
        <div className="text-center flex-1">
          <div className="text-xs text-muted-foreground">Revenue</div>
          <div className="font-mono tabular-nums font-semibold text-sm">
            {todayData ? fmt(todayData.totalRevenue) : "—"}
          </div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center flex-1">
          <div className="text-xs text-muted-foreground">Orders</div>
          <div className="font-semibold text-sm">
            {todayData ? todayData.transactions.toString() : "—"}
          </div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center flex-1">
          <div className="text-xs text-muted-foreground">Avg Order</div>
          <div className="font-mono tabular-nums font-semibold text-sm">
            {todayData ? fmt(todayData.avgTicket) : "—"}
          </div>
        </div>
      </div>
    )
  }

  // Desktop: 4-card grid
  return (
    <SummaryCardGrid>
      <SummaryCard
        label="Today's Revenue"
        value={todayData ? fmt(todayData.totalRevenue) : "—"}
        data-testid="today-revenue"
      />
      <SummaryCard
        label="Transactions"
        value={todayData ? todayData.transactions.toString() : "—"}
      />
      <SummaryCard
        label="Avg Order"
        value={todayData ? fmt(todayData.avgTicket) : "—"}
      />
      <SummaryCard
        label="Peak Hour"
        value={todayData ? todayData.peakHour.label : "—"}
      />
    </SummaryCardGrid>
  )
}
