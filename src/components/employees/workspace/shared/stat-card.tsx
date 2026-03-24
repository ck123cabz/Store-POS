"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface StatCardProps extends React.ComponentProps<"div"> {
  label: string
  value: string
  icon?: React.ReactNode
  borderColor?: string
}

function StatCard({
  label,
  value,
  icon,
  borderColor,
  className,
  ...props
}: StatCardProps) {
  return (
    <Card
      data-slot="stat-card"
      className={cn("gap-0 p-4 py-4 shadow-none", className)}
      style={borderColor ? { borderLeftWidth: 3, borderLeftColor: borderColor } : undefined}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <span className="text-xl font-bold font-mono tabular-nums mt-1">
        {value}
      </span>
    </Card>
  )
}

export { StatCard }
export type { StatCardProps }
