"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

  const ingredientLow =
    product.linkedIngredient?.stockStatus === "low" ||
    product.linkedIngredient?.stockStatus === "critical"
  const ingredientOut = product.linkedIngredient?.stockStatus === "out"

  const isDisabled = stockStatus.isOutOfStock || ingredientOut
  const isLowStock = stockStatus.isLowStock && !stockStatus.isOutOfStock
  const needsPricing = product.needsPricing

  const ingredientPercentage = product.linkedIngredient
    ? getIngredientStockPercentage(
        product.linkedIngredient.quantity,
        product.linkedIngredient.parLevel
      )
    : null

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        "cursor-pointer select-none",
        isDisabled && "opacity-60 cursor-not-allowed hover:scale-100",
        isLowStock && !isDisabled && "ring-2 ring-orange-400/70",
        needsPricing && !isDisabled && "ring-2 ring-red-400/70 ring-dashed"
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
          {isLowStock && stockStatus.quantityLeft !== undefined && (
            <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-[10px] px-1.5 py-0.5 shadow-sm">
              {stockStatus.quantityLeft} left
            </Badge>
          )}
          {ingredientLow && !ingredientOut && (
            <div className="bg-orange-500 text-white rounded-full p-1 shadow-sm" title="Linked ingredient low">
              <AlertTriangle className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>

      {/* Out of stock overlay */}
      {stockStatus.isOutOfStock && (
        <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-[2px] flex items-center justify-center">
          <Badge variant="destructive" className="text-xs font-bold px-3 py-1.5 shadow-lg">
            OUT OF STOCK
          </Badge>
        </div>
      )}

      {/* Ingredient out overlay */}
      {ingredientOut && !stockStatus.isOutOfStock && (
        <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-[2px] flex items-center justify-center">
          <Badge variant="destructive" className="text-xs font-bold px-3 py-1.5 shadow-lg">
            UNAVAILABLE
          </Badge>
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
