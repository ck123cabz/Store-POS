"use client"

import { Pencil, Package, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/ingredient-utils"
import type { Ingredient, PurchaseVariant } from "@/types/ingredient"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IngredientDetailProps {
  ingredient: Ingredient | null
  onEdit: (ingredient: Ingredient) => void
  onRestock: (ingredient: Ingredient) => void
  onBack?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getStockColor(status: Ingredient["stockStatus"]): string {
  switch (status) {
    case "ok":
      return "bg-status-ok"
    case "low":
      return "bg-status-warning"
    case "critical":
      return "bg-status-critical"
    case "out":
      return "bg-status-critical"
    default:
      return "bg-status-ok"
  }
}

function formatQty(value: number, abbr: string): string {
  const formatted = value % 1 === 0 ? value.toString() : value.toFixed(1)
  return `${formatted} ${abbr}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <Card className="py-4">
      <CardContent className="px-4 py-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="mt-1 text-lg font-mono tabular-nums font-semibold">
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function StockLevelBar({
  ingredient,
  onEdit,
}: {
  ingredient: Ingredient
  onEdit: () => void
}) {
  const { stockRatio, parLevel, stockStatus } = ingredient

  if (parLevel <= 0) {
    return (
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>No alert set</span>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs underline underline-offset-2 hover:text-foreground transition-colors"
        >
          edit
        </button>
      </div>
    )
  }

  const percentage = stockRatio != null ? Math.min(stockRatio, 100) : 0
  const barColor = getStockColor(stockStatus)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground uppercase tracking-wide">
          Stock Level
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono tabular-nums font-medium">
            {stockRatio != null ? stockRatio : 0}% LEVEL
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            edit
          </button>
        </div>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function VariantsTable({ variants }: { variants: PurchaseVariant[] }) {
  if (variants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No purchase variants
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
            <th className="pb-2 pr-4 font-medium">Variant</th>
            <th className="pb-2 pr-4 font-medium">Content</th>
            <th className="pb-2 pr-4 font-medium">Cost</th>
            <th className="pb-2 pr-4 font-medium">Per Restock</th>
            <th className="pb-2 font-medium">Vendor</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.id} className="border-b last:border-0">
              <td className="py-2.5 pr-4">
                <span className="flex items-center gap-2">
                  {v.label}
                  {v.isDefault && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Default
                    </Badge>
                  )}
                </span>
              </td>
              <td className="py-2.5 pr-4 font-mono tabular-nums">
                {v.contentQty} {v.contentUnitName ?? "—"}
              </td>
              <td className="py-2.5 pr-4 font-mono tabular-nums">
                {formatCurrency(v.costPerVariant)}
              </td>
              <td className="py-2.5 pr-4 font-mono tabular-nums">
                {v.baseUnitsPerVariant % 1 === 0
                  ? v.baseUnitsPerVariant
                  : v.baseUnitsPerVariant.toFixed(2)}
              </td>
              <td className="py-2.5 text-muted-foreground">
                —
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function IngredientDetail({
  ingredient,
  onEdit,
  onRestock,
  onBack,
}: IngredientDetailProps) {
  if (!ingredient) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to list
          </Button>
        )}
        <p className="text-muted-foreground">
          Select an ingredient to view details
        </p>
      </div>
    )
  }

  const subtitle = [ingredient.vendorName, ingredient.category]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              <ArrowLeft className="h-3 w-3" />
              All Ingredients
            </button>
          )}
          <h2 className="text-2xl font-semibold truncate">{ingredient.name}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(ingredient)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRestock(ingredient)}
          >
            <Package className="mr-1.5 h-3.5 w-3.5" />
            Restock
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Current Stock"
          value={formatQty(ingredient.stockQty, ingredient.baseUnitAbbr)}
        />
        <StatCard
          label="Reorder Alert"
          value={formatQty(ingredient.parLevel, ingredient.baseUnitAbbr)}
        />
        <StatCard
          label="Avg Cost"
          value={`${formatCurrency(ingredient.avgCostPerBaseUnit)}/${ingredient.baseUnitAbbr}`}
        />
      </div>

      {/* Stock level bar */}
      <StockLevelBar
        ingredient={ingredient}
        onEdit={() => onEdit(ingredient)}
      />

      {/* Purchase variants */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Purchase Variants
        </h3>
        <VariantsTable variants={ingredient.purchaseVariants} />
      </div>
    </div>
  )
}
