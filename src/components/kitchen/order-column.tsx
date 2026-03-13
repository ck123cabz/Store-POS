"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { StatusDot } from "@/components/ui/status-dot"
import { OrderCard } from "./order-card"
import type { KitchenOrder } from "@/hooks/use-kitchen-orders"

interface OrderColumnProps {
  status: "new" | "cooking" | "ready"
  orders: KitchenOrder[]
  onUpdateStatus: (orderId: number, status: string) => void
  onCancelOrder: (orderId: number) => void
  onToggleRush: (orderId: number, isRush: boolean) => void
  className?: string
  warningMinutes?: number
  dangerMinutes?: number
}

const statusConfig = {
  new: {
    nextStatus: "cooking",
    actionLabel: "Start",
    dotVariant: "info" as const,
    label: "New",
  },
  cooking: {
    nextStatus: "ready",
    actionLabel: "Ready",
    dotVariant: "warning" as const,
    label: "Cooking",
  },
  ready: {
    nextStatus: "served",
    actionLabel: "Served",
    dotVariant: "ok" as const,
    label: "Ready",
  },
}

export function OrderColumn({
  status,
  orders,
  onUpdateStatus,
  onCancelOrder,
  onToggleRush,
  className,
  warningMinutes,
  dangerMinutes,
}: OrderColumnProps) {
  const config = statusConfig[status]

  return (
    <div className={cn("flex-1 min-w-[280px]", className)}>
      {/* Column Header */}
      <div className="bg-muted px-4 py-2.5 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot variant={config.dotVariant} />
          <span className="text-sm font-semibold text-foreground">
            {config.label}
          </span>
        </div>
        <Badge variant="secondary">{orders.length}</Badge>
      </div>

      {/* Column Body */}
      <div className="bg-muted/30 rounded-b-lg p-3 min-h-[400px] space-y-3">
        {orders.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No orders
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAction={() => onUpdateStatus(order.id, config.nextStatus)}
              onCancel={() => onCancelOrder(order.id)}
              onToggleRush={() => onToggleRush(order.id, !order.isRush)}
              actionLabel={config.actionLabel}
              warningMinutes={warningMinutes}
              dangerMinutes={dangerMinutes}
            />
          ))
        )}
      </div>
    </div>
  )
}
