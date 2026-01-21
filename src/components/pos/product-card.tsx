"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface ProductCardProps {
  product: {
    id: number
    name: string
    price: number
    quantity: number
    trackStock: boolean
    image: string
  }
  currencySymbol: string
  onAddToCart: () => void
}

export function ProductCard({ product, currencySymbol, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.trackStock && product.quantity <= 0

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isOutOfStock ? "opacity-50" : ""
      }`}
      onClick={() => !isOutOfStock && onAddToCart()}
    >
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
          <div className="mt-1">
            {product.trackStock ? (
              <Badge variant={product.quantity > 0 ? "secondary" : "destructive"}>
                Stock: {product.quantity}
              </Badge>
            ) : (
              <Badge variant="outline">N/A</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
