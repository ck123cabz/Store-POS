"use client"

import * as React from "react"
import { FlaskConical, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusDot } from "@/components/ui/status-dot"
import type { Ingredient, StockStatus } from "@/types/ingredient"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stockStatusToVariant(status: StockStatus) {
  switch (status) {
    case "ok":
      return "ok" as const
    case "low":
      return "warning" as const
    case "critical":
    case "out":
      return "critical" as const
    default:
      return "neutral" as const
  }
}

function formatStock(qty: number, unit: string) {
  const formatted = Number.isInteger(qty) ? qty.toString() : qty.toFixed(2)
  return `${formatted} ${unit}`
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IngredientListProps {
  ingredients: Ingredient[]
  selectedId: number | null
  onSelect: (ingredient: Ingredient) => void
  loading: boolean
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function IngredientListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md px-3 py-3">
          <Skeleton className="size-2 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function IngredientList({
  ingredients,
  selectedId,
  onSelect,
  loading,
}: IngredientListProps) {
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    if (!query.trim()) return ingredients
    const lower = query.toLowerCase()
    return ingredients.filter((i) => i.name.toLowerCase().includes(lower))
  }, [ingredients, query])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">
          All Ingredients
        </h2>
        <Badge variant="secondary" className="font-mono tabular-nums">
          {ingredients.length}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative border-b px-3 py-2">
        <Search className="text-muted-foreground pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search ingredients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {loading ? (
        <IngredientListSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="size-10" />}
          title={query ? "No results" : "No ingredients"}
          description={
            query
              ? `No ingredients match "${query}"`
              : "Add your first ingredient to get started."
          }
          className="flex-1"
        />
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {filtered.map((ingredient) => {
              const isSelected = ingredient.id === selectedId
              return (
                <button
                  key={ingredient.id}
                  type="button"
                  onClick={() => onSelect(ingredient)}
                  className={cn(
                    "flex items-center gap-3 border-b px-4 py-3 text-left transition-colors",
                    "hover:bg-muted/50",
                    isSelected && "bg-accent"
                  )}
                >
                  <StatusDot
                    variant={stockStatusToVariant(ingredient.stockStatus)}
                    pulse={
                      ingredient.stockStatus === "critical" ||
                      ingredient.stockStatus === "out"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium flex items-center gap-1.5">
                      {ingredient.name}
                      {ingredient.type === "PREPARED" && (
                        <FlaskConical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {ingredient.category}
                      {" \u00B7 "}
                      <span className="font-mono tabular-nums">
                        {formatStock(
                          ingredient.stockQty,
                          ingredient.baseUnitAbbr || ingredient.baseUnitName
                        )}
                      </span>
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

export { IngredientList }
export type { IngredientListProps }
