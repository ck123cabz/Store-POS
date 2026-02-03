"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Image from "next/image"
import { DollarSign, Package } from "lucide-react"
import { cn } from "@/lib/utils"

interface Availability {
  status: "available" | "low" | "critical" | "out"
  maxProducible: number | null
  limitingIngredient: { id: number; name: string } | null
  warnings: string[]
}

interface ProductCardProps {
  product: {
    id: number
    name: string
    price: number
    image: string
    needsPricing?: boolean
    availability: Availability
  }
  currencySymbol: string
  onAddToCart: () => void
}

export function ProductCard({ product, currencySymbol, onAddToCart }: ProductCardProps) {
  const { availability } = product

  // Determine disabled state based on availability
  const isDisabled = availability.status === "out"

  // Determine low stock from availability
  const isLowStock = (availability.status === "low" || availability.status === "critical") && !isDisabled

  const needsPricing = product.needsPricing

  // Helper to render availability indicator
  const renderAvailabilityIndicator = () => {
    const { status, maxProducible, limitingIngredient } = availability

    // For "available" status (maxProducible > 20 or null) - subtle green text
    if (status === "available") {
      return (
        <span className="text-[10px] text-green-600 dark:text-green-500 font-medium">
          In Stock
        </span>
      )
    }

    // For "out" status - handled by overlay, don't show badge here
    if (status === "out") {
      return null
    }

    // For "low" status (maxProducible 6-20) - yellow badge with count
    if (status === "low") {
      const badge = (
        <Badge
          variant="outline"
          className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 border-yellow-300 dark:border-yellow-500/30 text-[10px] px-1.5 py-0.5 shadow-sm font-medium"
        >
          Can make {maxProducible}
        </Badge>
      )

      if (limitingIngredient) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {badge}
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Low on {limitingIngredient.name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }

      return badge
    }

    // For "critical" status (maxProducible 1-5) - orange badge with count and ingredient info
    if (status === "critical") {
      const badge = (
        <div className="flex flex-col items-end gap-0.5">
          <Badge
            variant="outline"
            className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-500 border-orange-300 dark:border-orange-500/30 text-[10px] px-1.5 py-0.5 shadow-sm font-medium"
          >
            Only {maxProducible} left
          </Badge>
          {limitingIngredient && (
            <span className="text-[9px] text-muted-foreground">
              Low on {limitingIngredient.name}
            </span>
          )}
        </div>
      )

      return badge
    }

    return null
  }

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        "cursor-pointer select-none",
        isDisabled && "opacity-60 cursor-not-allowed hover:scale-100",
        isLowStock && !isDisabled && "ring-2 ring-orange-400/70",
        needsPricing && !isDisabled && "ring-2 ring-red-400/70 ring-dashed",
        // Critical status gets a stronger ring
        availability.status === "critical" && !isDisabled && "ring-2 ring-orange-500/80"
      )}
      onClick={() => !isDisabled && onAddToCart()}
      aria-disabled={isDisabled}
      tabIndex={isDisabled ? -1 : 0}
      role="button"
      aria-label={`${product.name}, ${currencySymbol}${product.price.toFixed(2)}${isDisabled ? ", unavailable" : ""}`}
    >
      {/* Status badges - top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-2">
        {/* Left side badges */}
        <div className="flex flex-col gap-1">
          {needsPricing && (
            <Badge className="bg-red-500 hover:bg-red-500 text-white text-[10px] px-1.5 py-0.5 shadow-sm">
              <DollarSign className="h-3 w-3 mr-0.5" />
              SET PRICE
            </Badge>
          )}
        </div>

        {/* Right side badges */}
        <div className="flex flex-col gap-1 items-end">
          {/* Availability-based indicator */}
          {renderAvailabilityIndicator()}
        </div>
      </div>

      {/* Out of stock overlay - using availability status */}
      {isDisabled && (
        <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1">
          <Badge variant="destructive" className="text-xs font-bold px-3 py-1.5 shadow-lg">
            OUT OF STOCK
          </Badge>
          {availability.limitingIngredient && (
            <span className="text-[10px] text-muted-foreground">
              Missing: {availability.limitingIngredient.name}
            </span>
          )}
        </div>
      )}

      <CardContent className="p-0">
        {/* Product image */}
        <div className="aspect-square relative bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
          {product.image ? (
            <Image
              src={`/uploads/${product.image}`}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50">
              <Package className="h-10 w-10 mb-1" />
              <span className="text-[10px]">No image</span>
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="p-3 space-y-1.5 bg-card">
          <p className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">
              {currencySymbol}{product.price.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
