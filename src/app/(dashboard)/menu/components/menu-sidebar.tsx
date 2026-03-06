"use client"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { StatusDot } from "@/components/ui/status-dot"
import {
  Search,
  Layers,
  Coffee,
  Leaf,
  Croissant,
  UtensilsCrossed,
  CupSoda,
  Folder,
} from "lucide-react"

interface StockHealth {
  available: number
  low: number
  critical: number
  out: number
}

interface Category {
  id: number
  name: string
  productCount: number
  stockHealth: StockHealth
}

interface MenuSidebarProps {
  categories: Category[]
  selectedCategoryId: number | null
  onSelectCategory: (categoryId: number | null) => void
  totalProducts: number
  search: string
  onSearchChange: (value: string) => void
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  coffee: Coffee,
  tea: Leaf,
  pastries: Croissant,
  pastry: Croissant,
  meals: UtensilsCrossed,
  meal: UtensilsCrossed,
  drinks: CupSoda,
  drink: CupSoda,
}

function getCategoryIcon(name: string) {
  const key = name.toLowerCase()
  for (const [k, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return Icon
  }
  return Folder
}

function getOverallStockVariant(health: StockHealth): "ok" | "warning" | "critical" | "neutral" {
  const total = health.available + health.low + health.critical + health.out
  if (total === 0) return "neutral"
  if (health.out > 0) return "critical"
  if (health.low > 0 || health.critical > 0) return "warning"
  return "ok"
}

export function MenuSidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  totalProducts,
  search,
  onSearchChange,
}: MenuSidebarProps) {
  // Aggregate stock health across all categories
  const totalHealth = categories.reduce(
    (acc, cat) => ({
      available: acc.available + cat.stockHealth.available,
      low: acc.low + cat.stockHealth.low,
      critical: acc.critical + cat.stockHealth.critical,
      out: acc.out + cat.stockHealth.out,
    }),
    { available: 0, low: 0, critical: 0, out: 0 }
  )

  return (
    <aside className="flex flex-col w-64 shrink-0 border-r bg-muted/30 p-5 gap-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Menu</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalProducts} products · {categories.length} categories
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-9 text-sm"
          aria-label="Search products"
        />
      </div>

      {/* Category label */}
      <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        Categories
      </p>

      {/* Category list */}
      <nav className="flex flex-col gap-0.5 -mt-2">
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 h-9 text-sm transition-colors",
            selectedCategoryId === null
              ? "bg-primary text-primary-foreground font-medium"
              : "text-foreground hover:bg-muted"
          )}
        >
          <Layers className="size-3.5 shrink-0" />
          <span className="flex-1 text-left truncate">All Products</span>
          <span className={cn(
            "font-mono text-[11px] tabular-nums",
            selectedCategoryId === null ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {totalProducts}
          </span>
        </button>

        {categories.map((cat) => {
          const Icon = getCategoryIcon(cat.name)
          const isActive = selectedCategoryId === cat.id
          const healthVariant = getOverallStockVariant(cat.stockHealth)

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 h-9 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="flex-1 text-left truncate">{cat.name}</span>
              <StatusDot
                variant={healthVariant}
                className={cn(isActive && "[&_[data-slot=status-dot]]:ring-1 [&_[data-slot=status-dot]]:ring-primary-foreground/30")}
              />
              <span className={cn(
                "font-mono text-[11px] tabular-nums",
                isActive ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {cat.productCount}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stock Health Summary */}
      <div className="rounded-lg border bg-background p-3.5 space-y-3">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Stock Health
        </p>
        <div className="grid grid-cols-3 text-center gap-2">
          <div>
            <p className="text-lg font-semibold text-status-ok font-mono tabular-nums">
              {totalHealth.available}
            </p>
            <p className="text-[10px] text-muted-foreground">OK</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-status-warning font-mono tabular-nums">
              {totalHealth.low + totalHealth.critical}
            </p>
            <p className="text-[10px] text-muted-foreground">Low</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-status-critical font-mono tabular-nums">
              {totalHealth.out}
            </p>
            <p className="text-[10px] text-muted-foreground">Out</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
