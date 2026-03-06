"use client"

import Image from "next/image"
import { getImageSrc, isDataUrl } from "@/lib/image-utils"
import { formatCurrency } from "@/lib/ingredient-utils"
import { cn } from "@/lib/utils"
import { UtensilsCrossed, Plus, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface IngredientShortage {
  id: number
  name: string
  have: number
  needPerUnit: number
  status: "missing" | "low"
}

interface Product {
  id: number
  name: string
  price: number
  categoryId: number
  categoryName: string
  image: string
  trueCost?: number | null
  trueMarginPercent?: number | null
  recipeItemCount?: number
  availability: {
    status: "available" | "low" | "critical" | "out"
    maxProducible: number | null
    missingIngredients: IngredientShortage[]
    lowIngredients: IngredientShortage[]
  }
  status?: string
}

interface ProductCardsProps {
  products: Product[]
  selectedProductId: number | null
  onSelectProduct: (product: Product) => void
  onAddProduct?: () => void
  targetMargin?: number
  hasFilters?: boolean
  onClearFilters?: () => void
}

function getStockConfig(status: "available" | "low" | "critical" | "out") {
  switch (status) {
    case "available":
      return { label: "Available", color: "text-status-ok", bg: "bg-status-ok/10", dot: "bg-status-ok" }
    case "low":
      return { label: "Low Stock", color: "text-status-warning", bg: "bg-status-warning/10", dot: "bg-status-warning" }
    case "critical":
      return { label: "Critical", color: "text-status-warning", bg: "bg-status-warning/10", dot: "bg-status-warning" }
    case "out":
      return { label: "Out of Stock", color: "text-status-critical", bg: "bg-status-critical/10", dot: "bg-status-critical" }
  }
}

function getMarginConfig(marginPercent: number, targetMargin: number) {
  if (marginPercent >= targetMargin) return { color: "bg-status-ok", text: "text-status-ok" }
  if (marginPercent >= targetMargin * 0.75) return { color: "bg-status-warning", text: "text-status-warning" }
  return { color: "bg-status-critical", text: "text-status-critical" }
}

// Gradient placeholders per category keyword
const CATEGORY_GRADIENTS: Record<string, string> = {
  coffee: "from-amber-700 to-amber-900",
  tea: "from-emerald-400 to-emerald-800",
  pastry: "from-amber-300 to-amber-700",
  pastries: "from-amber-300 to-amber-700",
  meal: "from-red-400 to-red-900",
  meals: "from-red-400 to-red-900",
  drink: "from-cyan-300 to-cyan-800",
  drinks: "from-cyan-300 to-cyan-800",
}

function getCategoryGradient(categoryName: string) {
  const key = categoryName.toLowerCase()
  for (const [k, gradient] of Object.entries(CATEGORY_GRADIENTS)) {
    if (key.includes(k)) return gradient
  }
  return "from-slate-400 to-slate-700"
}

export function ProductCards({
  products,
  selectedProductId,
  onSelectProduct,
  onAddProduct,
  targetMargin = 65,
  hasFilters = false,
  onClearFilters,
}: ProductCardsProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {hasFilters ? (
          <SearchX className="size-10 text-muted-foreground mb-3" />
        ) : (
          <UtensilsCrossed className="size-10 text-muted-foreground mb-3" />
        )}
        <p className="font-medium">
          {hasFilters ? "No products match your filters" : "Your menu is a blank canvas"}
        </p>
        {!hasFilters && (
          <p className="text-sm text-muted-foreground mt-1">
            Add your first product to get started.
          </p>
        )}
        <div className="mt-4">
          {hasFilters ? (
            <Button size="sm" variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : onAddProduct ? (
            <Button size="sm" onClick={onAddProduct}>
              <Plus className="size-4 mr-2" /> Add Product
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {products.map((product) => {
        const stock = getStockConfig(product.availability.status)
        const hasImage = !!product.image
        const isSelected = product.id === selectedProductId
        const gradient = getCategoryGradient(product.categoryName)

        return (
          <button
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className={cn(
              "group rounded-lg border text-left transition-all overflow-hidden",
              "hover:shadow-sm hover:border-border/80",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected && "ring-2 ring-primary border-primary"
            )}
          >
            {/* Image / Gradient placeholder */}
            <div className={cn("relative w-full h-32 overflow-hidden", !hasImage && `bg-gradient-to-br ${gradient}`)}>
              {hasImage ? (
                <Image
                  src={getImageSrc(product.image)}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized={isDataUrl(product.image)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <UtensilsCrossed className="size-8 text-white/30" />
                </div>
              )}
              {/* Lifecycle badge overlay */}
              {product.status && product.status !== "ACTIVE" && (
                <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded bg-black/60 text-white">
                  {product.status}
                </span>
              )}
            </div>

            {/* Card body */}
            <div className="p-3 space-y-2.5">
              {/* Name + Price row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground">{product.categoryName}</p>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums shrink-0">
                  {formatCurrency(product.price)}
                </span>
              </div>

              {/* Margin bar + Stock badge */}
              <div className="flex items-center justify-between">
                {product.trueMarginPercent != null ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", getMarginConfig(product.trueMarginPercent, targetMargin).color)}
                        style={{ width: `${Math.min(100, Math.max(0, product.trueMarginPercent))}%` }}
                      />
                    </div>
                    <span className={cn(
                      "font-mono text-[11px] tabular-nums font-medium",
                      getMarginConfig(product.trueMarginPercent, targetMargin).text
                    )}>
                      {product.trueMarginPercent.toFixed(0)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-foreground">No recipe</span>
                )}

                <span className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
                  stock.bg, stock.color
                )}>
                  <span className={cn("size-1.5 rounded-full", stock.dot)} />
                  {stock.label}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
