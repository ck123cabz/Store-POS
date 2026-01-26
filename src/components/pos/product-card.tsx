"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { AlertTriangle } from "lucide-react"

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
    image: string
    linkedIngredientId?: number | null
    needsPricing?: boolean
    linkedIngredient?: LinkedIngredient | null
  }
  currencySymbol: string
  onAddToCart: () => void
}

export function ProductCard({ product, currencySymbol, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.trackStock && product.quantity <= 0
  const ingredientLow =
    product.linkedIngredient?.stockStatus === "low" ||
    product.linkedIngredient?.stockStatus === "critical"
  const ingredientOut = product.linkedIngredient?.stockStatus === "out"

  // Determine if product should be disabled
  const isDisabled = isOutOfStock || ingredientOut

  // Determine warning badge
  const showWarning = ingredientLow && !ingredientOut

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md relative ${
        isDisabled ? "opacity-50" : ""
      } ${showWarning ? "ring-2 ring-orange-300" : ""}`}
      onClick={() => !isDisabled && onAddToCart()}
    >
      {/* Low stock warning indicator */}
      {showWarning && (
        <div className="absolute top-1 right-1 z-10">
          <div className="bg-orange-500 text-white rounded-full p-1">
            <AlertTriangle className="h-3 w-3" />
          </div>
        </div>
      )}

      {/* Needs pricing indicator */}
      {product.needsPricing && (
        <div className="absolute top-1 left-1 z-10">
          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
            $?
          </Badge>
        </div>
      )}

      <CardContent className="p-3">
        <div className="aspect-square relative bg-gray-100 rounded-md mb-2">
          {product.image ? (
            <Image
              src={`/uploads/${product.image}`}
              alt={product.name}
              fill
              className="object-cover rounded-md"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
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
            {/* Product stock badge */}
            {product.trackStock ? (
              <Badge variant={product.quantity > 0 ? "secondary" : "destructive"}>
                Stock: {product.quantity}
              </Badge>
            ) : (
              <Badge variant="outline">N/A</Badge>
            )}

            {/* Linked ingredient stock badge */}
            {product.linkedIngredient && (
              <Badge
                variant={
                  product.linkedIngredient.stockStatus === "out"
                    ? "destructive"
                    : product.linkedIngredient.stockStatus === "critical"
                    ? "destructive"
                    : product.linkedIngredient.stockStatus === "low"
                    ? "secondary"
                    : "outline"
                }
                className={
                  product.linkedIngredient.stockStatus === "low"
                    ? "bg-orange-100 text-orange-800 text-xs"
                    : product.linkedIngredient.stockStatus === "critical"
                    ? "text-xs"
                    : "text-xs"
                }
              >
                {product.linkedIngredient.stockStatus === "out"
                  ? "Out"
                  : product.linkedIngredient.stockRatio !== null
                  ? `${product.linkedIngredient.stockRatio}%`
                  : "-"}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
