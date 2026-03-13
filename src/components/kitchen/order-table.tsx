"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusDot } from "@/components/ui/status-dot"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Zap } from "lucide-react"
import type { KitchenOrder } from "@/hooks/use-kitchen-orders"

interface OrderTableProps {
  orders: KitchenOrder[]
  onUpdateStatus: (orderId: number, status: string) => void
  onCancelOrder: (orderId: number) => void
  onToggleRush: (orderId: number, isRush: boolean) => void
}

const statusConfig: Record<
  "new" | "cooking" | "ready",
  {
    nextStatus: string
    actionLabel: string
    dotVariant: "info" | "warning" | "ok"
    label: string
  }
> = {
  new: { nextStatus: "cooking", actionLabel: "Start Cooking", dotVariant: "info", label: "New" },
  cooking: { nextStatus: "ready", actionLabel: "Mark Ready", dotVariant: "warning", label: "Cooking" },
  ready: { nextStatus: "served", actionLabel: "Serve", dotVariant: "ok", label: "Ready" },
}

function formatTime(seconds: number): string {
  if (seconds < 60) return "< 1m"
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m`
}

function getTimeAlertLevel(seconds: number): "normal" | "warning" | "danger" {
  const minutes = seconds / 60
  if (minutes >= 10) return "danger"
  if (minutes >= 5) return "warning"
  return "normal"
}

export function OrderTable({
  orders,
  onUpdateStatus,
  onCancelOrder,
  onToggleRush,
}: OrderTableProps) {
  // Sort: rush orders first, then by displayOrder
  const sorted = [...orders].sort((a, b) => {
    if (a.isRush !== b.isRush) return a.isRush ? -1 : 1
    return a.displayOrder - b.displayOrder
  })

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Order</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[80px]">Time</TableHead>
            <TableHead className="w-[140px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((order) => {
            const config = statusConfig[order.status as "new" | "cooking" | "ready"]
            if (!config) return null
            const alertLevel = getTimeAlertLevel(order.secondsInStatus)
            const itemsSummary = order.items
              .map((item) => `${item.quantity}x ${item.productName}`)
              .join(", ")

            return (
              <TableRow
                key={order.id}
                className={cn(order.isRush && "bg-status-warning/5")}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono tabular-nums">
                      #{order.orderNumber}
                    </span>
                    {order.isRush && (
                      <Badge
                        variant="secondary"
                        className="bg-status-warning/15 text-status-warning border-status-warning/25 px-1.5 py-0"
                      >
                        <Zap className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="max-w-[300px] truncate block text-sm text-muted-foreground">
                    {itemsSummary}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusDot variant={config.dotVariant} label={config.label} />
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "font-mono tabular-nums text-sm",
                      alertLevel === "warning" && "text-status-warning",
                      alertLevel === "danger" && "text-status-critical font-semibold"
                    )}
                  >
                    {formatTime(order.secondsInStatus)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    onClick={() => onUpdateStatus(order.id, config.nextStatus)}
                  >
                    {config.actionLabel}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
