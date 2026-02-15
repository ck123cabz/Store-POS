import * as React from "react"
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

type TrendDirection = "up" | "down" | "neutral"

interface SummaryCardProps extends React.ComponentProps<"div"> {
  label: string
  value: string
  trend?: TrendDirection
  trendLabel?: string
}

const trendConfig: Record<
  TrendDirection,
  { icon: React.ElementType; className: string }
> = {
  up: { icon: ArrowUpIcon, className: "text-status-ok" },
  down: { icon: ArrowDownIcon, className: "text-status-critical" },
  neutral: { icon: ArrowRightIcon, className: "text-muted-foreground" },
}

function SummaryCard({
  label,
  value,
  trend,
  trendLabel,
  className,
  ...props
}: SummaryCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null

  return (
    <Card
      data-slot="summary-card"
      className={cn("gap-0 p-4 py-4 shadow-none", className)}
      {...props}
    >
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
        {label}
      </span>
      <span className="text-xl font-bold font-mono tabular-nums mt-1">
        {value}
      </span>
      {trendInfo && (
        <span
          className={cn(
            "text-xs mt-1 flex items-center gap-1",
            trendInfo.className
          )}
        >
          <trendInfo.icon className="size-3" />
          {trendLabel}
        </span>
      )}
    </Card>
  )
}

function SummaryCardGrid({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="summary-card-grid"
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
        className
      )}
      {...props}
    />
  )
}

export { SummaryCard, SummaryCardGrid }
export type { TrendDirection, SummaryCardProps }
