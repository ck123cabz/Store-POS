"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap } from "lucide-react"
import type { KitchenOrder } from "@/hooks/use-kitchen-orders"

interface OrderCardProps {
  order: KitchenOrder
  onAction: () => void
  onToggleRush: () => void
  actionLabel: string
}

function formatTime(seconds: number): string {
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m`
}

function getTimeAlertLevel(seconds: number): "normal" | "warning" | "danger" {
  const minutes = seconds / 60
  if (minutes >= 10) return "danger"
  if (minutes >= 5) return "warning"
  return "normal"
}

export function OrderCard({
  order,
  onAction,
  onToggleRush,
  actionLabel,
}: OrderCardProps) {
  const alertLevel = getTimeAlertLevel(order.secondsInStatus)

  return (
    <Card
      className={cn(
        "p-4 transition-all",
        order.isRush &&
          "ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
        alertLevel === "warning" &&
          !order.isRush &&
          "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/10",
        alertLevel === "danger" &&
          !order.isRush &&
          "border-red-500 bg-red-50/50 dark:bg-red-950/10"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">#{order.orderNumber}</span>
          {order.isRush && (
            <Badge
              variant="secondary"
              className="bg-yellow-500 text-yellow-950"
            >
              <Zap className="h-3 w-3 mr-1" />
              RUSH
            </Badge>
          )}
        </div>
        <button
          onClick={onToggleRush}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            order.isRush
              ? "bg-yellow-500 text-yellow-950 hover:bg-yellow-600"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
          title={order.isRush ? "Remove rush" : "Mark as rush"}
        >
          <Zap className="h-4 w-4" />
        </button>
      </div>

      {/* Items */}
      <div className="space-y-1 mb-3">
        {order.items.map((item) => (
          <div key={item.id} className="text-sm">
            <span className="font-medium">{item.quantity}x</span>{" "}
            <span>{item.productName}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        <span
          className={cn(
            "text-sm",
            alertLevel === "warning" && "text-yellow-600 font-medium",
            alertLevel === "danger" && "text-red-600 font-medium"
          )}
        >
          {formatTime(order.secondsInStatus)}
        </span>
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </Card>
  )
}
