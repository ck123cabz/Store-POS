"use client"

import { Check, AlertTriangle, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CountItem, CountEntry } from "@/types/inventory-count"
import { DISCREPANCY_REASONS } from "@/types/inventory-count"

interface CountItemRowProps {
  item: CountItem
  entry: CountEntry | undefined
  onQuickConfirm: (ingredientId: number) => void
  onOpenDiscrepancy: (item: CountItem) => void
}

export function CountItemRow({
  item,
  entry,
  onQuickConfirm,
  onOpenDiscrepancy,
}: CountItemRowProps) {
  const isConfirmed = entry?.confirmed
  const hasDiscrepancy = entry?.actual !== null && entry?.actual !== item.expected
  const reasonInfo = entry?.reason
    ? DISCREPANCY_REASONS.find((r) => r.value === entry.reason)
    : null

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border",
        isConfirmed && !hasDiscrepancy && "bg-status-ok/10 border-status-ok/30",
        isConfirmed && hasDiscrepancy && "bg-status-warning/10 border-status-warning/30",
        !isConfirmed && "bg-background"
      )}
    >
      {/* Left: Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.name}</span>
          {isConfirmed && !hasDiscrepancy && (
            <Badge variant="outline" className="bg-status-ok/15 text-status-ok border-status-ok/30">
              <Check className="h-3 w-3 mr-1" />
              Matched
            </Badge>
          )}
          {isConfirmed && hasDiscrepancy && reasonInfo && (
            <Badge variant="outline" className="bg-status-warning/15 text-status-warning border-status-warning/30">
              <span className="mr-1">{reasonInfo.icon}</span>
              {entry.actual} {item.unit}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Expected: {item.expected} {item.unit}
          {item.category && <span className="ml-2">• {item.category}</span>}
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 ml-4">
        {!isConfirmed ? (
          <>
            {/* Quick confirm button (checkmark) */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0"
              onClick={() => onQuickConfirm(item.ingredientId)}
              title="Confirm count matches"
            >
              <Check className="h-4 w-4 text-status-ok" />
            </Button>
            {/* Discrepancy button */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0"
              onClick={() => onOpenDiscrepancy(item)}
              title="Report discrepancy"
            >
              <AlertTriangle className="h-4 w-4 text-status-warning" />
            </Button>
          </>
        ) : (
          /* Edit button for already confirmed items */
          <Button
            size="sm"
            variant="ghost"
            className="h-9 w-9 p-0"
            onClick={() => onOpenDiscrepancy(item)}
            title="Edit count"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
