"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProductCard } from "./product-card"
import { toast } from "sonner"

interface Product {
  id: number
  name: string
  price: number
  quantity: number
  trackStock: boolean
  image: string
  categoryId: number
}

interface Category {
  id: number
  name: string
}

interface ProductGridProps {
  products: Product[]
  categories: Category[]
  currencySymbol: string
  onAddToCart: (product: Product) => void
}

export function ProductGrid({
  products,
  categories,
  currencySymbol,
  onAddToCart,
}: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [searchSku, setSearchSku] = useState("")

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products

  const handleSkuSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const product = products.find((p) => p.id === parseInt(searchSku))

    if (product) {
      if (product.trackStock && product.quantity <= 0) {
        toast.error("Out of stock! This item is currently unavailable")
      } else {
        onAddToCart(product)
        setSearchSku("")
      }
    } else {
      toast.error(`${searchSku} is not a valid barcode!`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          onClick={() => setSelectedCategory(null)}
          size="sm"
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            onClick={() => setSelectedCategory(category.id)}
            size="sm"
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Barcode Search */}
      <form onSubmit={handleSkuSearch} className="flex gap-2">
        <Input
          placeholder="Scan barcode or enter SKU..."
          value={searchSku}
          onChange={(e) => setSearchSku(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            currencySymbol={currencySymbol}
            onAddToCart={() => onAddToCart(product)}
          />
        ))}
      </div>
    </div>
  )
}
