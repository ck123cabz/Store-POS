"use client"

import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"

interface MobileCartBarProps {
  itemCount: number
  total: number
  currencySymbol: string
  onViewCart: () => void
}

export function MobileCartBar({
  itemCount,
  total,
  currencySymbol,
  onViewCart,
}: MobileCartBarProps) {
  if (itemCount === 0) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 md:hidden pb-safe">
      <div className="mx-3 mb-3 flex items-center justify-between gap-3 rounded-xl bg-primary p-3 shadow-float">
        <div className="flex items-center gap-2 text-primary-foreground min-w-0">
          <ShoppingBag className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium truncate">
            {itemCount} {itemCount === 1 ? "item" : "items"}{" "}
            <span className="font-mono tabular-nums">
              · {currencySymbol}{total.toFixed(2)}
            </span>
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="h-9 px-4 font-semibold flex-shrink-0"
          onClick={onViewCart}
        >
          View Cart
        </Button>
      </div>
    </div>
  )
}
