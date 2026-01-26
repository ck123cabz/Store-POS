"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { AlertTriangle, DollarSign } from "lucide-react"
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
  // Use the stock status utility for consistent calculation (EC-03 compliant)
  const stockStatus = getStockStatus({
    quantity: product.quantity,
    trackStock: product.trackStock,
    parLevel: product.parLevel,
  })

  const ingredientLow =
    product.linkedIngredient?.stockStatus === "low" ||
    product.linkedIngredient?.stockStatus === "critical"
  const ingredientOut = product.linkedIngredient?.stockStatus === "out"

  // Determine if product should be disabled (T029, T035.6)
  const isDisabled = stockStatus.isOutOfStock || ingredientOut

  // Determine if low stock warning should show (T026, T027)
  const isLowStock = stockStatus.isLowStock && !stockStatus.isOutOfStock

  // T031: Needs pricing indicator (can co-exist with other states)
  const needsPricing = product.needsPricing

  // Calculate linked ingredient percentage for badge (T030)
  const ingredientPercentage = product.linkedIngredient
    ? getIngredientStockPercentage(
        product.linkedIngredient.quantity,
        product.linkedIngredient.parLevel
      )
    : null

  // EC-01, EC-02, EC-04: Multiple indicators can show simultaneously

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md relative",
        // T029: Out of stock visual treatment
        isDisabled && "opacity-50 pointer-events-none",
        // T027: Orange accent border for low-stock products
        isLowStock && !isDisabled && "ring-2 ring-orange-400",
        // T028: Red dashed border for needs-pricing products
        needsPricing && !isDisabled && "border-2 border-dashed border-red-400"
      )}
      onClick={() => !isDisabled && onAddToCart()}
      // T035: Accessibility for disabled tiles (NFR-A03, NFR-A04)
      aria-disabled={isDisabled}
      tabIndex={isDisabled ? -1 : 0}
      role="button"
      aria-label={`${product.name}, ${currencySymbol}${product.price.toFixed(2)}${isDisabled ? ", unavailable" : ""}`}
    >
      {/* T026: Low stock warning badge ("X left") - top right */}
      {isLowStock && stockStatus.quantityLeft !== undefined && (
        <div className="absolute top-1 right-1 z-10">
          <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-xs px-1.5">
            {stockStatus.quantityLeft} left
          </Badge>
        </div>
      )}

      {/* EC-02: Linked ingredient low warning - top right (offset if low stock badge) */}
      {ingredientLow && !ingredientOut && (
        <div className={cn("absolute z-10", isLowStock ? "top-7 right-1" : "top-1 right-1")}>
          <div className="bg-orange-500 text-white rounded-full p-1" title="Linked ingredient low">
            <AlertTriangle className="h-3 w-3" />
          </div>
        </div>
      )}

      {/* T028: Needs pricing indicator - top left */}
      {needsPricing && (
        <div className="absolute top-1 left-1 z-10">
          <Badge className="bg-red-100 hover:bg-red-100 text-red-800 text-xs border border-red-300 gap-0.5">
            <DollarSign className="h-3 w-3" />
            SET PRICE
          </Badge>
        </div>
      )}

      {/* T029: Out of stock overlay */}
      {stockStatus.isOutOfStock && (
        <div className="absolute inset-0 z-20 bg-background/60 flex items-center justify-center rounded-lg">
          <Badge variant="destructive" className="text-sm font-semibold">
            OUT OF STOCK
          </Badge>
        </div>
      )}

      <CardContent className="p-3">
        <div className="aspect-square relative bg-muted rounded-md mb-2">
          {product.image ? (
            <Image
              src={`/uploads/${product.image}`}
              alt={product.name}
              fill
              className="object-cover rounded-md"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="font-medium text-sm truncate">{product.name}</p>
          <p className="text-green-600 font-bold">
            {currencySymbol}{product.price.toFixed(2)}
          </p>
          <div className="mt-1 flex flex-col gap-1 items-center">
            {/* Product stock badge - only show if tracking stock */}
            {product.trackStock && (
              <Badge
                variant={
                  stockStatus.isOutOfStock
                    ? "destructive"
                    : stockStatus.isLowStock
                    ? "secondary"
                    : "outline"
                }
                className={cn(
                  "text-xs",
                  stockStatus.isLowStock && !stockStatus.isOutOfStock && "bg-orange-100 text-orange-800"
                )}
              >
                Stock: {product.quantity}
              </Badge>
            )}

            {/* T030: Linked ingredient stock percentage badge with color coding */}
            {product.linkedIngredient && ingredientPercentage !== null && (
              <Badge
                variant={ingredientOut ? "destructive" : "outline"}
                className={cn(
                  "text-xs",
                  !ingredientOut && getStockPercentageColor(ingredientPercentage)
                )}
              >
                {ingredientOut
                  ? "Ingredient Out"
                  : `${ingredientPercentage}%`}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
