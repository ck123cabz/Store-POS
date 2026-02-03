"use client"

import { cn } from "@/lib/utils"
import { OrderCard } from "./order-card"
import type { KitchenOrder } from "@/hooks/use-kitchen-orders"

interface OrderColumnProps {
  title: string
  status: "new" | "cooking" | "ready"
  orders: KitchenOrder[]
  onUpdateStatus: (orderId: number, status: string) => void
  onToggleRush: (orderId: number, isRush: boolean) => void
}

const statusConfig = {
  new: { nextStatus: "cooking", actionLabel: "Start" },
  cooking: { nextStatus: "ready", actionLabel: "Ready" },
  ready: { nextStatus: "served", actionLabel: "Served" },
}

export function OrderColumn({
  title,
  status,
  orders,
  onUpdateStatus,
  onToggleRush,
}: OrderColumnProps) {
  const config = statusConfig[status]

  return (
    <div className="flex-1 min-w-[280px] max-w-[380px]">
      {/* Column Header */}
      <div
        className={cn(
          "px-4 py-2 rounded-t-lg font-semibold flex items-center justify-between",
          status === "new" &&
            "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
          status === "cooking" &&
            "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
          status === "ready" &&
            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
        )}
      >
        <span>{title}</span>
        <span className="text-sm font-normal opacity-70">{orders.length}</span>
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
              onToggleRush={() => onToggleRush(order.id, !order.isRush)}
              actionLabel={config.actionLabel}
            />
          ))
        )}
      </div>
    </div>
  )
}
