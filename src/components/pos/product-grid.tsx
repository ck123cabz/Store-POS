"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProductCard } from "./product-card"
import { toast } from "sonner"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Search, X, Grid3X3, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface Availability {
  status: "available" | "low" | "critical" | "out"
  maxProducible: number | null
  limitingIngredient: { id: number; name: string } | null
  warnings: string[]
}

interface Product {
  id: number
  name: string
  price: number
  quantity: number
  trackStock: boolean
  image: string
  categoryId: number
  linkedIngredientId?: number | null
  needsPricing?: boolean
  availability: Availability
  linkedIngredient?: {
    id: number
    name: string
    quantity: number
    parLevel: number
    unit: string
    stockStatus: "ok" | "low" | "critical" | "out" | null
    stockRatio: number | null
  } | null
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
  const [searchQuery, setSearchQuery] = useState("")
  const [gridSize, setGridSize] = useState<"normal" | "compact">("normal")

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Filter by category
    if (selectedCategory !== null) {
      filtered = filtered.filter((p) => p.categoryId === selectedCategory)
    }

    // Filter by search query (name or SKU/ID)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.id.toString() === query
      )
    }

    return filtered
  }, [products, selectedCategory, searchQuery])

  // Count products per category
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    products.forEach((p) => {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1
    })
    return counts
  }, [products])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // If search is a number (SKU), try to add directly
    const sku = parseInt(searchQuery)
    if (!isNaN(sku)) {
      const product = products.find((p) => p.id === sku)
      if (product) {
        // Use availability system (004-ingredient-unit-system)
        if (product.availability.status === "out") {
          const reason = product.availability.limitingIngredient
            ? `Out of ${product.availability.limitingIngredient.name}`
            : "Out of stock"
          toast.error(`${reason}! This item is currently unavailable`)
        } else {
          if (product.availability.status === "critical") {
            const limitMsg = product.availability.maxProducible
              ? `Only ${product.availability.maxProducible} left`
              : "Running very low"
            toast.warning(limitMsg)
          }
          onAddToCart(product)
          setSearchQuery("")
          toast.success(`Added ${product.name} to cart`)
        }
        return
      }
    }
    // Otherwise just filter
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  return (
    <div className="space-y-4">
      {/* Search and controls */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products or scan barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-11 text-base"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </form>

        {/* Grid size toggle - 44px minimum touch targets */}
        <div className="hidden sm:flex items-center border rounded-lg p-1 bg-muted/50">
          <Button
            variant={gridSize === "normal" ? "secondary" : "ghost"}
            size="icon"
            className="h-11 w-11 min-h-11 min-w-11"
            onClick={() => setGridSize("normal")}
            aria-label="Normal grid size"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={gridSize === "compact" ? "secondary" : "ghost"}
            size="icon"
            className="h-11 w-11 min-h-11 min-w-11"
            onClick={() => setGridSize("compact")}
            aria-label="Compact grid size"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Category pills - horizontally scrollable with 44px minimum touch targets */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "rounded-full h-11 min-h-11 px-4 font-medium transition-all",
              selectedCategory === null && "shadow-md"
            )}
          >
            All
            <Badge
              variant="secondary"
              className={cn(
                "ml-2 rounded-full px-2 py-0 text-xs",
                selectedCategory === null && "bg-primary-foreground/20 text-primary-foreground"
              )}
            >
              {products.length}
            </Badge>
          </Button>

          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "rounded-full h-11 min-h-11 px-4 font-medium transition-all",
                selectedCategory === category.id && "shadow-md"
              )}
            >
              {category.name}
              <Badge
                variant="secondary"
                className={cn(
                  "ml-2 rounded-full px-2 py-0 text-xs",
                  selectedCategory === category.id && "bg-primary-foreground/20 text-primary-foreground"
                )}
              >
                {categoryCounts[category.id] || 0}
              </Badge>
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          {filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
        </p>
      )}

      {/* Product Grid - Responsive columns: 1-5 based on viewport width */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm">Try adjusting your search or category filter</p>
          {(searchQuery || selectedCategory !== null) && (
            <Button
              variant="outline"
              className="mt-4 h-11 min-h-11"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory(null)
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-3",
            // Responsive grid: 1 col on very small, 2 on small phones, up to 5 on large screens
            gridSize === "normal"
              ? "grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              : "grid-cols-2 min-[360px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          )}
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              currencySymbol={currencySymbol}
              onAddToCart={() => onAddToCart(product)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
