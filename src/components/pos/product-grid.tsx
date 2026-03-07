"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProductCard } from "./product-card"
import { toast } from "sonner"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"

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
  linkedVariantId?: number | null
  needsPricing?: boolean
  status?: string
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

/**
 * Custom hook for debounced value.
 * Returns the debounced value after the specified delay.
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export function ProductGrid({
  products,
  categories,
  currencySymbol,
  onAddToCart,
}: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebouncedValue(searchQuery, 200)

  // Filter products by category and debounced search
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Filter by category
    if (selectedCategory !== null) {
      filtered = filtered.filter((p) => p.categoryId === selectedCategory)
    }

    // Filter by search query (name or SKU/ID)
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase().trim()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.id.toString() === query
      )
    }

    return filtered
  }, [products, selectedCategory, debouncedSearch])

  // Count products per category
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    products.forEach((p) => {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1
    })
    return counts
  }, [products])

  // Toggle category: tapping active pill deselects (shows all)
  const handleCategoryToggle = useCallback((categoryId: number | null) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId))
  }, [])

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
    <div className="space-y-3">
      {/* Search input - flat design, no shadows */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search products or scan barcode"
            placeholder="Search products or scan barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-10 text-sm focus-visible:ring-1"
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Category FilterPills - horizontal scrollable */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-1.5 pb-1">
          {/* "All" pill */}
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "inline-flex items-center rounded-full px-3.5 h-[30px] text-xs font-medium transition-colors whitespace-nowrap shrink-0",
              selectedCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            All
            <span
              className={cn(
                "ml-1.5 text-[10px] font-semibold tabular-nums",
                selectedCategory === null
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground"
              )}
            >
              {products.length}
            </span>
          </button>

          {categories.map((category) => {
            const isActive = selectedCategory === category.id
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryToggle(category.id)}
                className={cn(
                  "inline-flex items-center rounded-full px-3.5 h-[30px] text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {category.name}
                <span
                  className={cn(
                    "ml-1.5 text-[10px] font-semibold tabular-nums",
                    isActive
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {categoryCounts[category.id] || 0}
                </span>
              </button>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Results count */}
      {debouncedSearch && (
        <p className="text-xs text-muted-foreground">
          {filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""} for &ldquo;{debouncedSearch}&rdquo;
        </p>
      )}

      {/* Product Grid - Responsive columns: 2 on phone, 3-4 tablet, 5 desktop */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          title="No products found"
          description="Try adjusting your search or category filter"
          action={
            (searchQuery || selectedCategory !== null) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory(null)
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
          className="py-16"
        />
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
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
