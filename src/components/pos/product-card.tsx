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
import { AlertTriangle, DollarSign, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getStockStatus,
  getIngredientStockPercentage,
  getStockPercentageColor,
} from "@/lib/stock-status"

interface LinkedIngredient {
  id: number
  name: string
  quantity: number
  parLevel: number
  unit: string
  stockStatus: "ok" | "low" | "critical" | "out" | null
  stockRatio: number | null
}

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
    quantity: number
    trackStock: boolean
    parLevel?: number
    image: string
    linkedIngredientId?: number | null
    needsPricing?: boolean
    availability: Availability
    linkedIngredient?: LinkedIngredient | null
  }
  currencySymbol: string
  onAddToCart: () => void
}

export function ProductCard({ product, currencySymbol, onAddToCart }: ProductCardProps) {
  const stockStatus = getStockStatus({
    quantity: product.quantity,
    trackStock: product.trackStock,
    parLevel: product.parLevel,
  })

  // Use availability data (now required)
  const { availability } = product
  const availabilityStatus = availability.status

  const ingredientLow =
    product.linkedIngredient?.stockStatus === "low" ||
    product.linkedIngredient?.stockStatus === "critical"
  const ingredientOut = product.linkedIngredient?.stockStatus === "out"

  // Determine disabled state: availability status is "out" takes precedence
  const isDisabledByAvailability = availabilityStatus === "out"
  const isDisabled = isDisabledByAvailability || stockStatus.isOutOfStock || ingredientOut

  // Determine low stock from availability
  const isLowByAvailability = availabilityStatus === "low" || availabilityStatus === "critical"
  const isLowStock = isLowByAvailability && !isDisabled

  const needsPricing = product.needsPricing

  const ingredientPercentage = product.linkedIngredient
    ? getIngredientStockPercentage(
        product.linkedIngredient.quantity,
        product.linkedIngredient.parLevel
      )
    : null

  // Build tooltip text for availability
  const getAvailabilityTooltip = (): string | null => {
    const { status, limitingIngredient, maxProducible } = availability
    if (status === "available") return null
    if (status === "out" && limitingIngredient) {
      return `Out of ${limitingIngredient.name}`
    }
    if (status === "critical" && limitingIngredient && maxProducible !== null) {
      return `Only ${maxProducible} left (${limitingIngredient.name})`
    }
    if (status === "low" && limitingIngredient) {
      return `Low on ${limitingIngredient.name}`
    }
    return null
  }

  const tooltipText = getAvailabilityTooltip()

  // Helper to render availability badge
  const renderAvailabilityBadge = () => {
    if (availability.status === "available") return null

    const { status, maxProducible, limitingIngredient } = availability

    // Badge content and styling based on status
    let badgeContent: React.ReactNode = null
    let badgeClassName = ""

    if (status === "low") {
      badgeContent = "Low"
      badgeClassName = "bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 border-yellow-500/30"
    } else if (status === "critical") {
      badgeContent = maxProducible !== null ? `Only ${maxProducible}` : "Critical"
      badgeClassName = "bg-orange-500/20 text-orange-700 dark:text-orange-500 border-orange-500/30"
    } else if (status === "out") {
      // Out status is handled by overlay, don't show badge
      return null
    }

    if (!badgeContent) return null

    const badge = (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] px-1.5 py-0.5 shadow-sm font-medium",
          badgeClassName
        )}
      >
        {status === "low" && <AlertTriangle className="h-3 w-3 mr-0.5" />}
        {badgeContent}
      </Badge>
    )

    // Wrap with tooltip if we have tooltip text
    if (tooltipText && limitingIngredient) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {badge}
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {tooltipText}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return badge
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
        availabilityStatus === "critical" && !isDisabled && "ring-2 ring-orange-500/80"
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
          {/* Availability-based badge */}
          {renderAvailabilityBadge()}
        </div>
      </div>

      {/* Out of stock overlay - using availability status */}
      {isDisabledByAvailability && (
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

            {/* Stock indicator */}
            {product.trackStock && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  stockStatus.isOutOfStock && "border-destructive/50 text-destructive",
                  stockStatus.isLowStock && !stockStatus.isOutOfStock && "border-orange-400/50 text-orange-600",
                  !stockStatus.isOutOfStock && !stockStatus.isLowStock && "border-muted text-muted-foreground"
                )}
              >
                {product.quantity} in stock
              </Badge>
            )}
          </div>

          {/* Linked ingredient indicator */}
          {product.linkedIngredient && ingredientPercentage !== null && (
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "h-1.5 flex-1 rounded-full bg-muted overflow-hidden"
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    ingredientOut ? "bg-destructive" : getStockPercentageColor(ingredientPercentage).replace("text-", "bg-").replace("-600", "-500")
                  )}
                  style={{ width: `${Math.min(ingredientPercentage, 100)}%` }}
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium tabular-nums",
                ingredientOut ? "text-destructive" : getStockPercentageColor(ingredientPercentage)
              )}>
                {ingredientOut ? "0%" : `${ingredientPercentage}%`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
