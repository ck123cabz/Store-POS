"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusDot } from "@/components/ui/status-dot"
import { Zap, ChevronDown, X } from "lucide-react"
import type { KitchenOrder } from "@/hooks/use-kitchen-orders"

interface OrderCardProps {
  order: KitchenOrder
  onAction: () => void
  onCancel: () => void
  onToggleRush: () => void
  actionLabel: string
  warningMinutes?: number
  dangerMinutes?: number
}

/** Max items to show before expanding */
const COLLAPSED_ITEM_LIMIT = 3

function formatTime(seconds: number): string {
  if (seconds < 60) return "Just now"
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m`
}

function getTimeAlertLevel(
  seconds: number,
  warningMin = 5,
  dangerMin = 10
): "normal" | "warning" | "danger" {
  const minutes = seconds / 60
  if (minutes >= dangerMin) return "danger"
  if (minutes >= warningMin) return "warning"
  return "normal"
}

export function OrderCard({
  order,
  onAction,
  onCancel,
  onToggleRush,
  actionLabel,
  warningMinutes = 5,
  dangerMinutes = 10,
}: OrderCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const alertLevel = getTimeAlertLevel(order.secondsInStatus, warningMinutes, dangerMinutes)
  const hasMoreItems = order.items.length > COLLAPSED_ITEM_LIMIT
  const visibleItems = expanded
    ? order.items
    : order.items.slice(0, COLLAPSED_ITEM_LIMIT)

  return (
    <Card
      className={cn(
        "relative p-0 gap-0 rounded-lg transition-all overflow-hidden",
        // Urgency escalation via LEFT BORDER only
        alertLevel === "warning" && "border-l-[3px] border-l-status-warning",
        alertLevel === "danger" &&
          "border-l-[3px] border-l-status-critical",
        // Rush flag: subtle amber background tint
        order.isRush && "bg-status-warning/5"
      )}
    >
      {/* Pulse overlay for danger-level orders */}
      {alertLevel === "danger" && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none bg-status-critical/5 animate-status-pulse motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}

      {/* Clickable card body for expand/collapse */}
      <button
        type="button"
        className="w-full text-left px-4 pt-4 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset rounded-t-lg"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={`Order #${order.orderNumber}, ${order.items.length} items. ${expanded ? "Collapse" : "Expand"} details.`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Urgency StatusDot */}
            {alertLevel !== "normal" && (
              <StatusDot
                variant={alertLevel === "danger" ? "critical" : "warning"}
                pulse={alertLevel === "danger"}
              />
            )}
            <span className="text-lg font-bold font-mono">
              #{order.orderNumber}
            </span>
            {order.isRush && (
              <Badge
                variant="secondary"
                className="bg-status-warning/15 text-status-warning border-status-warning/25"
              >
                <Zap className="h-3 w-3" />
                RUSH
              </Badge>
            )}
          </div>
          {/* Time in status + expand indicator */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {formatTime(order.secondsInStatus)}
            </span>
            {hasMoreItems && (
              <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", expanded && "rotate-180")} />
            )}
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-1">
          {visibleItems.map((item) => (
            <div key={item.id} className="text-sm flex items-baseline gap-1.5">
              <span className="font-mono tabular-nums font-medium text-muted-foreground">
                {item.quantity}x
              </span>
              <span>{item.productName}</span>
            </div>
          ))}
          {hasMoreItems && !expanded && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
              <ChevronDown className="h-3 w-3" />
              <span>
                {order.items.length - COLLAPSED_ITEM_LIMIT} more item
                {order.items.length - COLLAPSED_ITEM_LIMIT !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </button>

      {/* Expanded section: rush toggle + cancel */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-border/50 pt-3 space-y-2">
          <Button
            variant={order.isRush ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "w-full gap-1.5",
              order.isRush &&
                "bg-status-warning/15 text-status-warning hover:bg-status-warning/25 border-status-warning/25"
            )}
            onClick={(e) => {
              e.stopPropagation()
              onToggleRush()
            }}
          >
            <Zap className="h-3.5 w-3.5" />
            {order.isRush ? "Remove Rush" : "Mark as Rush"}
          </Button>
          {confirmingCancel ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={(e) => {
                  e.stopPropagation()
                  onCancel()
                  setConfirmingCancel(false)
                }}
              >
                Confirm Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmingCancel(false)
                }}
              >
                Keep Order
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/50"
              onClick={(e) => {
                e.stopPropagation()
                setConfirmingCancel(true)
              }}
            >
              <X className="h-3.5 w-3.5" />
              Cancel Order
            </Button>
          )}
        </div>
      )}

      {/* Action button: full-width primary at card bottom */}
      <div className="px-4 pb-4 pt-1">
        <Button
          className="w-full"
          onClick={(e) => {
            e.stopPropagation()
            onAction()
          }}
        >
          {actionLabel}
        </Button>
      </div>
    </Card>
  )
}
