"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tag,
  Scale,
  ShoppingCart,
  Utensils,
  Flame,
  ChefHat,
  ChevronDown,
  Trash2,
  Pencil,
  Plus,
  Info,
  Loader2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, getAvailableUnits } from "@/lib/ingredient-utils"
import { VariantFormDialog } from "@/components/ingredients/variant-form-dialog"
import type {
  Ingredient,
  PurchaseVariant,
  UnitAlias,
} from "@/types/ingredient"

// ─── Types ──────────────────────────────────────────────────────────────────

interface Unit {
  id: number
  name: string
  abbr: string
  dimension: "WEIGHT" | "VOLUME" | "COUNT"
  isDiscrete: boolean
}

interface Vendor {
  id: number
  name: string
}

interface IngredientEditPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredient: Ingredient | null
  vendors: Vendor[]
  units: Unit[]
  onSaved: () => void
}

const INGREDIENT_CATEGORIES = [
  "Protein",
  "Produce",
  "Dairy",
  "Dry Goods",
  "Beverages",
  "Condiments",
  "Spices",
  "Packaging",
  "Supplies",
  "Other",
]

// ─── Section Wrapper ────────────────────────────────────────────────────────

function FormSection({
  icon: Icon,
  title,
  badge,
  defaultOpen,
  open,
  onOpenChange,
  variant = "default",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  badge?: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  variant?: "default" | "warning"
  children: React.ReactNode
}) {
  const borderClass =
    variant === "warning"
      ? "border-status-warning/30"
      : "border-border"

  return (
    <Collapsible defaultOpen={defaultOpen} open={open} onOpenChange={onOpenChange}>
      <div className={`rounded-lg border ${borderClass}`}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors rounded-t-lg group">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {badge}
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 space-y-3 border-t">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function IngredientEditPanel({
  open,
  onOpenChange,
  ingredient,
  vendors,
  units,
  onSaved,
}: IngredientEditPanelProps) {
  const isEdit = !!ingredient

  // Form state
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [vendorId, setVendorId] = useState<string>("")
  const [baseUnitId, setBaseUnitId] = useState<string>("")
  const [initialStockQty, setInitialStockQty] = useState("0")
  const [parLevel, setParLevel] = useState("0")
  const [countUnitId, setCountUnitId] = useState<string>("")
  const [isOverhead, setIsOverhead] = useState(false)
  const [overheadPerTransaction, setOverheadPerTransaction] = useState("")
  const [yieldFactor, setYieldFactor] = useState("")

  // Unit aliases
  const [unitAliases, setUnitAliases] = useState<UnitAlias[]>([])
  const [newAliasName, setNewAliasName] = useState("")
  const [customUnitName, setCustomUnitName] = useState("")
  const [newAliasMultiplier, setNewAliasMultiplier] = useState("")
  const [addingAlias, setAddingAlias] = useState(false)

  // Purchase variants (loaded from ingredient)
  const [variants, setVariants] = useState<PurchaseVariant[]>([])

  // Variant form dialog
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [editVariant, setEditVariant] = useState<PurchaseVariant | null>(null)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Section open state
  const [identityOpen, setIdentityOpen] = useState(true)
  const [unitsOpen, setUnitsOpen] = useState(true)
  const [variantsOpen, setVariantsOpen] = useState(true)
  const [recipeUnitsOpen, setRecipeUnitsOpen] = useState(false)
  const [overheadOpen, setOverheadOpen] = useState(false)
  const [yieldOpen, setYieldOpen] = useState(false)

  // Populate form when ingredient changes
  useEffect(() => {
    if (!open) return
    if (ingredient) {
      setName(ingredient.name)
      setCategory(ingredient.category)
      setVendorId(ingredient.vendorId?.toString() || "")
      setBaseUnitId(ingredient.baseUnitId.toString())
      setParLevel(ingredient.parLevel.toString())
      setCountUnitId(ingredient.countUnitId?.toString() || "")
      setIsOverhead(ingredient.isOverhead)
      setOverheadPerTransaction(ingredient.overheadPerTransaction?.toString() || "")
      setYieldFactor(ingredient.yieldFactor?.toString() || "")
      setUnitAliases(ingredient.unitAliases)
      setVariants(ingredient.purchaseVariants)
      // Expand sections that have data
      setRecipeUnitsOpen(ingredient.unitAliases.length > 0)
      setOverheadOpen(ingredient.isOverhead)
      setYieldOpen(!!ingredient.yieldFactor)
    } else {
      resetForm()
    }
  }, [open, ingredient])

  function resetForm() {
    setName("")
    setCategory("")
    setVendorId("")
    setBaseUnitId("")
    setInitialStockQty("0")
    setParLevel("0")
    setCountUnitId("")
    setIsOverhead(false)
    setOverheadPerTransaction("")
    setYieldFactor("")
    setUnitAliases([])
    setVariants([])
    setNewAliasName("")
    setCustomUnitName("")
    setNewAliasMultiplier("")
    setIdentityOpen(true)
    setUnitsOpen(true)
    setVariantsOpen(false)
    setRecipeUnitsOpen(false)
    setOverheadOpen(false)
    setYieldOpen(false)
  }

  const selectedBaseUnitName = useMemo(() => {
    if (!baseUnitId) return "unit"
    const u = units.find((u) => u.id === parseInt(baseUnitId))
    return u?.name || "unit"
  }, [baseUnitId, units])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !category || !baseUnitId) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const url = ingredient
        ? `/api/ingredients/${ingredient.id}`
        : "/api/ingredients"
      const method = ingredient ? "PUT" : "POST"

      const body: Record<string, unknown> = {
        name,
        category,
        baseUnitId: parseInt(baseUnitId),
        vendorId: vendorId ? parseInt(vendorId) : null,
        parLevel: parseFloat(parLevel) || 0,
        countUnitId: countUnitId ? parseInt(countUnitId) : null,
        isOverhead,
        overheadPerTransaction:
          isOverhead && overheadPerTransaction
            ? parseFloat(overheadPerTransaction)
            : null,
        yieldFactor: yieldFactor ? parseFloat(yieldFactor) : null,
      }

      if (!ingredient) {
        const stock = parseFloat(initialStockQty) || 0
        if (stock > 0) body.initialStockQty = stock
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }

      toast.success(ingredient ? "Ingredient updated" : "Ingredient created")
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save ingredient"
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!ingredient) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/ingredients/${ingredient.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete")
      }
      toast.success("Ingredient deleted")
      setDeleteConfirmOpen(false)
      onOpenChange(false)
      onSaved()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete ingredient"
      )
    } finally {
      setDeleting(false)
    }
  }

  const handleAddAlias = useCallback(async () => {
    const aliasName =
      newAliasName === "__custom__"
        ? customUnitName.trim().toLowerCase()
        : newAliasName.trim().toLowerCase()

    if (!ingredient || !aliasName || !newAliasMultiplier) return

    setAddingAlias(true)
    try {
      const res = await fetch(
        `/api/ingredients/${ingredient.id}/unit-aliases`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: aliasName,
            baseUnitMultiplier: parseFloat(newAliasMultiplier),
            description: `1 ${aliasName} = ${newAliasMultiplier} ${selectedBaseUnitName}`,
          }),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add unit")
      }

      const alias = await res.json()
      setUnitAliases((prev) => [...prev, alias])
      setNewAliasName("")
      setCustomUnitName("")
      setNewAliasMultiplier("")
      toast.success(`Added "${alias.name}" unit`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add unit"
      )
    } finally {
      setAddingAlias(false)
    }
  }, [ingredient, newAliasName, customUnitName, newAliasMultiplier, selectedBaseUnitName])

  async function handleRemoveAlias(aliasId: number) {
    if (!ingredient) return
    try {
      const res = await fetch(
        `/api/ingredients/${ingredient.id}/unit-aliases/${aliasId}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Failed to delete")
      setUnitAliases((prev) => prev.filter((a) => a.id !== aliasId))
      toast.success("Unit removed")
    } catch {
      toast.error("Failed to remove unit")
    }
  }

  async function handleDeleteVariant(variantId: number) {
    if (!ingredient) return
    try {
      const res = await fetch(
        `/api/ingredients/${ingredient.id}/variants/${variantId}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete variant")
      }
      setVariants((prev) => prev.filter((v) => v.id !== variantId))
      toast.success("Variant removed")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete variant"
      )
    }
  }

  // ─── Computed badges ────────────────────────────────────────────────────────

  const identityBadge = !identityOpen && name ? (
    <Badge variant="secondary" className="text-xs font-normal">
      {name}
    </Badge>
  ) : null

  const unitsBadge = !unitsOpen && baseUnitId ? (
    <Badge variant="secondary" className="text-xs font-normal">
      {selectedBaseUnitName}
      {parLevel && parseFloat(parLevel) > 0 ? ` / par ${parLevel}` : ""}
    </Badge>
  ) : null

  const variantsBadge = !variantsOpen && variants.length > 0 ? (
    <Badge variant="secondary" className="text-xs font-normal">
      {variants.length} variant{variants.length !== 1 ? "s" : ""}
    </Badge>
  ) : null

  const recipeUnitsBadge = !recipeUnitsOpen && unitAliases.length > 0 ? (
    <Badge variant="secondary" className="text-xs font-normal">
      {unitAliases.length} custom
    </Badge>
  ) : null

  const overheadBadge = !overheadOpen ? (
    <Badge
      variant="secondary"
      className={`text-xs font-normal ${isOverhead ? "bg-status-warning/15 text-status-warning" : ""}`}
    >
      {isOverhead ? "On" : "Off"}
    </Badge>
  ) : null

  const yieldBadge = !yieldOpen && yieldFactor ? (
    <Badge variant="secondary" className="text-xs font-normal bg-status-warning/15 text-status-warning">
      {yieldFactor}x
    </Badge>
  ) : null

  // ─── Preset units for alias dropdown ────────────────────────────────────────

  const presetUnits = useMemo(() => {
    const existingNames = new Set([
      selectedBaseUnitName,
      ...unitAliases.map((a) => a.name),
      ...getAvailableUnits(selectedBaseUnitName, unitAliases)
        .filter((u) => !u.isBase)
        .map((u) => u.name),
    ])
    return [
      "serving", "slice", "scoop", "pinch", "dash", "bunch",
      "clove", "head", "stick", "portion", "cup", "tbsp",
      "tsp", "oz", "lb", "kg", "g", "L", "mL", "fl oz", "dozen",
    ].filter((p) => !existingNames.has(p))
  }, [selectedBaseUnitName, unitAliases])

  const isCustomAlias = newAliasName === "__custom__"

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="sm:max-w-[580px] w-full p-0 flex flex-col gap-0"
        >
          {/* Header */}
          <SheetHeader className="px-6 py-5 border-b space-y-0 flex flex-row items-center justify-between">
            <div>
              <SheetTitle className="text-lg">
                {isEdit ? "Edit Ingredient" : "Add Ingredient"}
              </SheetTitle>
              <SheetDescription className="text-sm mt-0.5">
                {isEdit
                  ? "Update ingredient details and configuration"
                  : "Define a new ingredient for your recipes"}
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          {/* Scrollable body */}
          <form
            id="ingredient-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
          >
            {/* Section 1: Identity */}
            <FormSection
              icon={Tag}
              title="Identity"
              badge={identityBadge}
              open={identityOpen}
              onOpenChange={setIdentityOpen}
            >
              <div className="space-y-2">
                <Label htmlFor="ing-name">Ingredient Name *</Label>
                <Input
                  id="ing-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Ground Beef"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger aria-label="Category">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INGREDIENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Select
                    value={vendorId || "__none__"}
                    onValueChange={(v) =>
                      setVendorId(v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger aria-label="Vendor">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No vendor</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id.toString()}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            {/* Section 2: Units & Stock */}
            <FormSection
              icon={Scale}
              title="Units & Stock"
              badge={unitsBadge}
              open={unitsOpen}
              onOpenChange={setUnitsOpen}
            >
              <p className="text-xs text-muted-foreground">
                The base unit is used for stock tracking and recipe calculations.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Base Unit *</Label>
                  <Select value={baseUnitId} onValueChange={setBaseUnitId}>
                    <SelectTrigger aria-label="Base unit">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.name} ({u.abbr})
                          <span className="text-muted-foreground ml-1 text-xs">
                            {u.dimension.toLowerCase()}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Count Unit</Label>
                  <Select
                    value={countUnitId || "__none__"}
                    onValueChange={(v) =>
                      setCountUnitId(v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger aria-label="Count unit">
                      <SelectValue placeholder="Same as base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Same as base unit</SelectItem>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.name} ({u.abbr})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Par level */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="ing-par">
                    Reorder Alert ({selectedBaseUnitName})
                  </Label>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex">
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>
                          When stock falls below this level, a warning appears
                          in the sidebar. Set to 0 to disable alerts.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="ing-par"
                  type="number"
                  min="0"
                  value={parLevel}
                  onChange={(e) => setParLevel(e.target.value)}
                  placeholder="0"
                />
              </div>

              {/* Initial stock (create only) */}
              {!isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="ing-stock">
                    Initial Stock ({selectedBaseUnitName})
                  </Label>
                  <Input
                    id="ing-stock"
                    type="number"
                    step="0.01"
                    min="0"
                    value={initialStockQty}
                    onChange={(e) => setInitialStockQty(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}

              {/* Stock display (edit only) */}
              {isEdit && ingredient && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Current Stock
                    </span>
                    <div className="font-mono tabular-nums font-medium">
                      {ingredient.stockQty % 1 === 0
                        ? ingredient.stockQty
                        : ingredient.stockQty.toFixed(2)}{" "}
                      {ingredient.baseUnitAbbr}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">
                      Avg Cost
                    </span>
                    <div className="font-mono tabular-nums font-medium">
                      {formatCurrency(ingredient.avgCostPerBaseUnit)}/
                      {ingredient.baseUnitAbbr}
                    </div>
                  </div>
                </div>
              )}
            </FormSection>

            {/* Section 3: Purchase Variants (edit only) */}
            {isEdit && (
              <FormSection
                icon={ShoppingCart}
                title="Purchase Variants"
                badge={variantsBadge}
                open={variantsOpen}
                onOpenChange={setVariantsOpen}
              >
                <p className="text-xs text-muted-foreground">
                  Different buyable formats of this ingredient (e.g., 25kg Sack, 1kg Pack).
                </p>

                {variants.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No purchase variants yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {variants.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-start justify-between p-3 rounded-md border bg-card"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {v.label}
                            </span>
                            {v.isDefault && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Default
                              </Badge>
                            )}
                            {v.sellable && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-status-ok/15 text-status-ok border-0">
                                Sellable
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>
                              {v.contentQty} {v.contentUnitName || "units"} x{" "}
                              {v.packageQty}
                            </span>
                            <span className="font-mono tabular-nums">
                              {formatCurrency(v.costPerVariant)}
                            </span>
                            <span className="font-mono tabular-nums">
                              {v.baseUnitsPerVariant} {selectedBaseUnitName}
                            </span>
                          </div>
                          {v.barcode && (
                            <div className="text-xs text-muted-foreground">
                              Barcode: {v.barcode}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditVariant(v)
                              setVariantDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {!v.isDefault && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteVariant(v.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => {
                    setEditVariant(null)
                    setVariantDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Purchase Variant
                </Button>
              </FormSection>
            )}

            {/* Section 4: Recipe Units */}
            <FormSection
              icon={Utensils}
              title="Recipe Units"
              badge={recipeUnitsBadge}
              open={recipeUnitsOpen}
              onOpenChange={setRecipeUnitsOpen}
            >
              {/* Standard conversions */}
              {(() => {
                const allUnits = getAvailableUnits(
                  selectedBaseUnitName,
                  unitAliases
                )
                const standardUnits = allUnits.filter(
                  (u) =>
                    !u.isBase &&
                    !unitAliases.some((a) => a.name === u.name)
                )
                if (standardUnits.length === 0) return null
                return (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">
                      Standard conversions
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {standardUnits.map((u) => (
                        <Badge
                          key={u.name}
                          variant="secondary"
                          className="font-normal text-xs"
                        >
                          {u.name}
                          <span className="text-muted-foreground ml-1">
                            {u.description}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Custom aliases */}
              {isEdit && unitAliases.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">
                    Custom units
                  </span>
                  <div className="space-y-2">
                    {unitAliases.map((alias) => (
                      <div
                        key={alias.id}
                        className="flex items-center justify-between p-2 bg-card rounded border"
                      >
                        <div>
                          <span className="font-medium text-sm">
                            {alias.name}
                          </span>
                          <span className="text-muted-foreground text-sm ml-2">
                            = {alias.baseUnitMultiplier} {selectedBaseUnitName}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          aria-label={`Remove ${alias.name}`}
                          onClick={() => handleRemoveAlias(alias.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add unit alias (edit only) */}
              {isEdit && (
                <div className="space-y-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Add unit
                  </span>
                  <div className="flex gap-2">
                    <Select
                      value={isCustomAlias ? "__custom__" : newAliasName}
                      onValueChange={(v) => {
                        setNewAliasName(v)
                        setNewAliasMultiplier("")
                      }}
                    >
                      <SelectTrigger
                        className="flex-1"
                        aria-label="Select unit to add"
                      >
                        <SelectValue placeholder="Select unit..." />
                      </SelectTrigger>
                      <SelectContent>
                        {presetUnits.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">
                          Other (custom)...
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">=</span>
                      <Input
                        type="number"
                        placeholder="Amt"
                        value={newAliasMultiplier}
                        onChange={(e) =>
                          setNewAliasMultiplier(e.target.value)
                        }
                        className="w-20"
                      />
                      <span className="text-xs text-muted-foreground">
                        {selectedBaseUnitName}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddAlias}
                      disabled={
                        addingAlias ||
                        (!isCustomAlias && !newAliasName) ||
                        (isCustomAlias && !customUnitName) ||
                        !newAliasMultiplier
                      }
                    >
                      {addingAlias ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                  {isCustomAlias && (
                    <Input
                      placeholder="Custom unit name"
                      value={customUnitName}
                      onChange={(e) => setCustomUnitName(e.target.value)}
                    />
                  )}
                </div>
              )}
            </FormSection>

            {/* Section 5: Overhead */}
            <FormSection
              icon={Flame}
              title="Overhead"
              badge={overheadBadge}
              open={overheadOpen}
              onOpenChange={setOverheadOpen}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ing-overhead" className="cursor-pointer">
                    Overhead Item
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Auto-deducted per transaction (e.g., packaging)
                  </p>
                </div>
                <Switch
                  id="ing-overhead"
                  checked={isOverhead}
                  onCheckedChange={setIsOverhead}
                />
              </div>
              {isOverhead && (
                <div className="space-y-2 pt-1">
                  <Label htmlFor="ing-overhead-amount">
                    Usage per transaction ({selectedBaseUnitName})
                  </Label>
                  <Input
                    id="ing-overhead-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={overheadPerTransaction}
                    onChange={(e) =>
                      setOverheadPerTransaction(e.target.value)
                    }
                    placeholder="e.g., 1"
                  />
                </div>
              )}
            </FormSection>

            {/* Section 6: Cooking Yield */}
            <FormSection
              icon={ChefHat}
              title="Cooking Yield"
              badge={yieldBadge}
              open={yieldOpen}
              onOpenChange={setYieldOpen}
              variant="warning"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  How much this ingredient expands or shrinks when cooked.
                </p>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex">
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>
                        Rice typically yields 3x (expands), meat yields 0.8x
                        (shrinks). Leave empty if not applicable.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10"
                  placeholder="e.g., 3 for rice"
                  value={yieldFactor}
                  onChange={(e) => setYieldFactor(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  x yield
                </span>
              </div>
              {yieldFactor && parseFloat(yieldFactor) > 0 && (
                <p className="text-sm text-muted-foreground">
                  1 {selectedBaseUnitName} raw &rarr;{" "}
                  {parseFloat(yieldFactor)} {selectedBaseUnitName} cooked
                </p>
              )}
            </FormSection>
          </form>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex items-center justify-between">
            {isEdit ? (
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" form="ingredient-form" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ingredient?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &ldquo;{ingredient?.name}&rdquo; from all recipes
              that use it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Variant Form Dialog */}
      {ingredient && (
        <VariantFormDialog
          open={variantDialogOpen}
          onOpenChange={setVariantDialogOpen}
          ingredientId={ingredient.id}
          ingredientName={ingredient.name}
          variant={editVariant}
          units={units}
          vendors={vendors}
          onSaved={(saved) => {
            setVariants((prev) => {
              const idx = prev.findIndex((v) => v.id === saved.id)
              if (idx >= 0) {
                const updated = [...prev]
                updated[idx] = saved
                return updated
              }
              return [...prev, saved]
            })
          }}
        />
      )}
    </>
  )
}
