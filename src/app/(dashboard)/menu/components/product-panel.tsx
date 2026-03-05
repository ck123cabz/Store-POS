"use client"

import { useState, useEffect, useCallback } from "react"
import { Pencil, Loader2, Info, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusDot } from "@/components/ui/status-dot"
import {
  DetailPanelHeader,
  DetailPanelContent,
  DetailPanelFooter,
} from "@/components/ui/detail-panel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatCurrency, getAvailableUnits } from "@/lib/ingredient-utils"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Image from "next/image"
import { getImageSrc, isDataUrl } from "@/lib/image-utils"

interface IngredientShortage {
  id: number
  name: string
  have: number
  needPerUnit: number
  status: "missing" | "low"
}

interface RecipeItem {
  id: number
  quantity: number
  ingredient: {
    id: number
    name: string
    baseUnit: string
    costPerBaseUnit: number
  }
}

interface Product {
  id: number
  name: string
  price: number
  categoryId: number
  categoryName: string
  image: string
  trueCost?: number | null
  trueMargin?: number | null
  trueMarginPercent?: number | null
  prepTime?: number | null
  overheadCost?: number | null
  recipeItems?: RecipeItem[]
  availability: {
    status: "available" | "low" | "critical" | "out"
    maxProducible: number | null
    limitingIngredientDetails?: IngredientShortage | null
    missingIngredients: IngredientShortage[]
    lowIngredients: IngredientShortage[]
  }
  status?: string
}

interface Category {
  id: number
  name: string
}

interface UnitAlias {
  name: string
  baseUnitMultiplier: number
  description: string | null
}

interface Ingredient {
  id: number
  name: string
  baseUnit: string
  costPerBaseUnit: number
  category: string
  yieldFactor: number | null
  unitAliases: UnitAlias[]
}

interface RecipeIngredient {
  ingredientId: number
  ingredientName: string
  quantity: number        // amount in chosen unit
  unit: string            // chosen unit name
  baseUnit: string        // ingredient's base unit
  baseQuantity: number    // converted to base units
  costPerUnit: number     // cost per base unit
  lineCost: number
  yieldFactor: number | null
  unitAliases: UnitAlias[]
}

interface ProductPanelProps {
  product: Product
  onClose: () => void
  onEdit: () => void
  onCancelEdit?: () => void
  onSaveSuccess?: () => void
  editMode?: boolean
  categories?: Category[]
  targetMargin?: number
  hourlyLaborRate?: number
  onStatusChange?: (newStatus: string) => void
  onDelete?: () => void
}

/** Returns the semantic margin color class based on margin percentage thresholds */
function marginColorClass(marginPercent: number): string {
  if (marginPercent >= 65) return "text-status-ok"
  if (marginPercent >= 50) return "text-status-warning"
  return "text-status-critical"
}

function StatusActions({
  status,
  productName,
  onStatusChange,
  onDelete,
}: {
  status: string
  productName: string
  onStatusChange?: (newStatus: string) => void
  onDelete?: () => void
}) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null)

  const actions: { label: string; targetStatus?: string; variant: "default" | "outline" | "destructive"; isDelete?: boolean }[] = []

  switch (status) {
    case "DRAFT":
      actions.push({ label: "Go Live", targetStatus: "ACTIVE", variant: "default" })
      actions.push({ label: "Delete", isDelete: true, variant: "destructive" })
      break
    case "ACTIVE":
      actions.push({ label: "Mark Unavailable", targetStatus: "UNAVAILABLE", variant: "outline" })
      actions.push({ label: "Discontinue", targetStatus: "DISCONTINUED", variant: "destructive" })
      break
    case "UNAVAILABLE":
      actions.push({ label: "Reactivate", targetStatus: "ACTIVE", variant: "default" })
      actions.push({ label: "Discontinue", targetStatus: "DISCONTINUED", variant: "destructive" })
      break
    case "DISCONTINUED":
      actions.push({ label: "Reactivate", targetStatus: "ACTIVE", variant: "default" })
      break
  }

  if (actions.length === 0) return null

  const handleAction = (action: typeof actions[0]) => {
    const actionKey = action.isDelete ? "delete" : action.targetStatus!
    if (actionKey === "DISCONTINUED" || action.isDelete) {
      if (confirmAction === actionKey) {
        if (action.isDelete) onDelete?.()
        else onStatusChange?.(action.targetStatus!)
        setConfirmAction(null)
      } else {
        setConfirmAction(actionKey)
      }
    } else {
      onStatusChange?.(action.targetStatus!)
    }
  }

  return (
    <div className="space-y-2">
      {confirmAction && (
        <p className="text-sm text-muted-foreground text-center">
          {confirmAction === "delete"
            ? `Permanently delete "${productName}"? This cannot be undone.`
            : `Remove "${productName}" from the POS? You can reactivate it later.`}
        </p>
      )}
      <div className="flex items-center gap-2 justify-end">
        {confirmAction && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
        )}
        {actions.map((action) => {
          const actionKey = action.isDelete ? "delete" : action.targetStatus!
          const isConfirming = confirmAction === actionKey
          return (
            <Button
              key={action.label}
              variant={isConfirming ? "destructive" : action.variant}
              size="sm"
              onClick={() => handleAction(action)}
            >
              {isConfirming ? "Confirm" : action.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export function ProductPanel({
  product,
  onClose,
  onEdit,
  onCancelEdit,
  onSaveSuccess,
  editMode = false,
  categories = [],
  targetMargin = 65,
  hourlyLaborRate = 100,
  onStatusChange,
  onDelete,
}: ProductPanelProps) {
  // Calculate labor cost
  const laborCost = product.prepTime
    ? (product.prepTime / 60) * hourlyLaborRate
    : 0

  // Combine all ingredient issues
  const allIssues = [
    ...product.availability.missingIngredients,
    ...product.availability.lowIngredients,
  ]

  // Edit mode state
  const [saving, setSaving] = useState(false)
  const [loadingEditData, setLoadingEditData] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])

  // Form state
  const [formData, setFormData] = useState({
    name: product.name,
    price: product.price.toString(),
    categoryId: product.categoryId,
  })
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([])
  const [prepTime, setPrepTime] = useState<number>(product.prepTime ?? 0)
  const [overheadCost, setOverheadCost] = useState<number>(product.overheadCost ?? 0)

  // Calculated costs (real-time in edit mode)
  const [editCosts, setEditCosts] = useState({
    foodCost: 0,
    laborCost: 0,
    overheadCost: 0,
    trueCost: 0,
    trueMargin: 0,
    trueMarginPercent: 0,
  })

  // Fetch ingredients and recipe data when entering edit mode
  const fetchEditData = useCallback(async () => {
    setLoadingEditData(true)
    try {
      const [recipeRes, ingredientsRes] = await Promise.all([
        fetch(`/api/recipes/${product.id}`),
        fetch("/api/ingredients"),
      ])

      const ingredientsData: Ingredient[] = await ingredientsRes.json()
      setAvailableIngredients(ingredientsData)

      if (recipeRes.ok) {
        const recipeData = await recipeRes.json()
        setRecipeIngredients(recipeData.ingredients || [])
        setPrepTime(recipeData.prepTime ?? 0)
        setOverheadCost(recipeData.overheadAllocation ?? 0)
      } else {
        // No recipe exists yet
        setRecipeIngredients([])
        setPrepTime(product.prepTime ?? 0)
        setOverheadCost(product.overheadCost ?? 0)
      }
    } catch (error) {
      console.error("Failed to fetch edit data:", error)
      toast.error("Failed to load recipe data")
    } finally {
      setLoadingEditData(false)
    }
  }, [product.id, product.prepTime, product.overheadCost])

  // Reset form when entering edit mode
  useEffect(() => {
    if (editMode) {
      setFormData({
        name: product.name,
        price: product.price.toString(),
        categoryId: product.categoryId,
      })
      setImageFile(null)
      setImagePreview(null)
      void fetchEditData()
    }
  }, [editMode, product.name, product.price, product.categoryId, fetchEditData])

  // Calculate costs whenever recipe changes in edit mode
  useEffect(() => {
    if (!editMode) return

    const price = parseFloat(formData.price) || 0
    const foodCost = recipeIngredients.reduce(
      (sum, item) => sum + item.baseQuantity * item.costPerUnit,
      0
    )
    const laborCostCalc = prepTime > 0 ? (prepTime / 60) * hourlyLaborRate : 0
    const trueCost = foodCost + laborCostCalc + overheadCost
    const trueMargin = price - trueCost
    const trueMarginPercent = price > 0 ? (trueMargin / price) * 100 : 0

    setEditCosts({
      foodCost: Math.round(foodCost * 100) / 100,
      laborCost: Math.round(laborCostCalc * 100) / 100,
      overheadCost: Math.round(overheadCost * 100) / 100,
      trueCost: Math.round(trueCost * 100) / 100,
      trueMargin: Math.round(trueMargin * 100) / 100,
      trueMarginPercent: Math.round(trueMarginPercent * 10) / 10,
    })
  }, [editMode, formData.price, recipeIngredients, prepTime, overheadCost, hourlyLaborRate])

  // Handle image file change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  // Recipe editing handlers
  const handleAddIngredient = (ingredientId: string) => {
    const ingredient = availableIngredients.find(
      (i) => i.id === parseInt(ingredientId)
    )
    if (!ingredient) return

    // Don't add duplicates
    if (recipeIngredients.some((ri) => ri.ingredientId === ingredient.id)) {
      toast.error("Ingredient already in recipe")
      return
    }

    setRecipeIngredients((prev) => [
      ...prev,
      {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: ingredient.baseUnit,        // Default to base unit
        baseUnit: ingredient.baseUnit,
        quantity: 1,
        baseQuantity: 1,
        costPerUnit: ingredient.costPerBaseUnit,
        lineCost: ingredient.costPerBaseUnit,
        yieldFactor: ingredient.yieldFactor ?? null,
        unitAliases: ingredient.unitAliases || [],
      },
    ])
  }

  // Resolve multiplier for a unit, checking custom aliases + standard siblings + presets
  const resolveMultiplier = (item: RecipeIngredient, unit: string): number => {
    if (unit === item.baseUnit) return 1
    const allUnits = getAvailableUnits(item.baseUnit, item.unitAliases)
    return allUnits.find((u) => u.name === unit)?.multiplier ?? 1
  }

  const handleUnitChange = (ingredientId: number, newUnit: string) => {
    setRecipeIngredients((prev) =>
      prev.map((item) => {
        if (item.ingredientId !== ingredientId) return item

        const multiplier = resolveMultiplier(item, newUnit)
        const baseQuantity = item.quantity * multiplier

        return {
          ...item,
          unit: newUnit,
          baseQuantity,
          lineCost: baseQuantity * item.costPerUnit,
        }
      })
    )
  }

  const handleQuantityChange = (ingredientId: number, quantity: number) => {
    setRecipeIngredients((prev) =>
      prev.map((item) => {
        if (item.ingredientId !== ingredientId) return item

        const multiplier = resolveMultiplier(item, item.unit)
        const baseQuantity = quantity * multiplier

        return {
          ...item,
          quantity,
          baseQuantity,
          lineCost: baseQuantity * item.costPerUnit,
        }
      })
    )
  }

  const handleRemoveIngredient = (ingredientId: number) => {
    setRecipeIngredients((prev) =>
      prev.filter((item) => item.ingredientId !== ingredientId)
    )
  }

  // Get ingredients not yet in the recipe
  const unusedIngredients = availableIngredients.filter(
    (ing) => !recipeIngredients.some((ri) => ri.ingredientId === ing.id)
  )

  // Save handler
  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error("Product name is required")
      return
    }
    const price = parseFloat(formData.price)
    if (!price || price <= 0) {
      toast.error("Price must be greater than 0")
      return
    }

    setSaving(true)
    try {
      let imageFilename = null

      // Upload image if changed
      if (imageFile) {
        const formDataUpload = new FormData()
        formDataUpload.append("file", imageFile)
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formDataUpload })
        if (!uploadRes.ok) throw new Error("Image upload failed")
        const { filename } = await uploadRes.json()
        imageFilename = filename
      }

      // Update product basic info
      const productBody = {
        name: formData.name,
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        ...(imageFilename && { image: imageFilename }),
      }

      const productRes = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productBody),
      })

      if (!productRes.ok) throw new Error("Failed to save product")

      // Update recipe
      const recipeRes = await fetch(`/api/recipes/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: recipeIngredients.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            baseQuantity: item.baseQuantity,
          })),
          prepTime: prepTime || null,
          overheadAllocation: overheadCost || null,
        }),
      })

      if (!recipeRes.ok) throw new Error("Failed to save recipe")

      toast.success("Product saved successfully")
      onSaveSuccess?.()
    } catch (error) {
      console.error("Failed to save:", error)
      toast.error("Failed to save product")
    } finally {
      setSaving(false)
    }
  }

  // ─── EDIT MODE ─────────────────────────────────────────────────────────────

  if (editMode) {
    if (loadingEditData) {
      return (
        <>
          <DetailPanelHeader
            title={`Edit ${product.name}`}
          />
          <DetailPanelContent>
            <div className="space-y-4 p-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </DetailPanelContent>
          <DetailPanelFooter>
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={onCancelEdit} disabled>
                Cancel
              </Button>
              <Button disabled>Save</Button>
            </div>
          </DetailPanelFooter>
        </>
      )
    }

    return (
      <>
        <DetailPanelHeader
          title={`Edit ${product.name}`}
        />

        {/* Content - scrollable */}
        <DetailPanelContent>
          <div className="space-y-4">
            {/* ── Section: Basic Info ── */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Product name"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Category</Label>
                <Select
                  value={formData.categoryId.toString()}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, categoryId: parseInt(v) }))
                  }
                >
                  <SelectTrigger className="h-10" aria-label="Category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Image</Label>
                <div className="flex items-center gap-4">
                  {imagePreview || product.image ? (
                    <Image
                      src={imagePreview || getImageSrc(product.image)}
                      alt={product.name}
                      width={64}
                      height={64}
                      className="rounded-md object-cover"
                      unoptimized={isDataUrl(imagePreview || product.image)}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs">
                      No image
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section: Pricing ── */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-price" className="text-sm font-medium">
                Price
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
                  ₱
                </span>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="0.00"
                  className="h-10 pl-7 font-mono tabular-nums"
                />
              </div>
            </div>

            <Separator />

            {/* ── Section: Recipe Builder ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Recipe
                </Label>
                <span className="text-xs text-muted-foreground">
                  {recipeIngredients.length} ingredient{recipeIngredients.length !== 1 ? "s" : ""}
                </span>
              </div>

              {recipeIngredients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No ingredients in recipe. Add ingredients below.
                </p>
              ) : (
                <div className="space-y-2">
                  {recipeIngredients.map((item) => {
                    // Build available units: base + custom aliases + standard siblings + presets
                    const availableUnits = getAvailableUnits(
                      item.baseUnit,
                      item.unitAliases
                    )
                    const showUnitDropdown = availableUnits.length > 1
                    const showConversion = item.unit !== item.baseUnit

                    return (
                      <div
                        key={item.ingredientId}
                        className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
                      >
                        {/* Ingredient name + cost/unit */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.ingredientName}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono tabular-nums">
                            {formatCurrency(item.costPerUnit)}/{item.baseUnit}
                          </p>
                        </div>

                        {/* Quantity + Unit */}
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                item.ingredientId,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 h-8 text-right font-mono tabular-nums"
                          />

                          {showUnitDropdown ? (
                            <Select
                              value={item.unit}
                              onValueChange={(v) =>
                                handleUnitChange(item.ingredientId, v)
                              }
                            >
                              <SelectTrigger className="w-24 h-8" aria-label={`Unit for ${item.ingredientName}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableUnits.map((u) => (
                                  <SelectItem key={u.name} value={u.name}>
                                    <span className="flex items-center gap-1.5">
                                      <span>{u.name}</span>
                                      {u.description && !u.isBase && (
                                        <span className="text-xs text-muted-foreground">
                                          {u.description}
                                        </span>
                                      )}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-sm text-muted-foreground w-12">
                              {item.baseUnit}
                            </span>
                          )}
                        </div>

                        {/* Conversion info tooltip */}
                        {showConversion && (
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="inline-flex">
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1 text-xs">
                                  <p>
                                    = {item.baseQuantity.toFixed(2)} {item.baseUnit}{" "}
                                    (raw)
                                  </p>
                                  {item.yieldFactor &&
                                    item.yieldFactor > 0 && (
                                      <p>
                                        ≈{" "}
                                        {(
                                          item.baseQuantity * item.yieldFactor
                                        ).toFixed(2)}{" "}
                                        {item.baseUnit} (cooked)
                                      </p>
                                    )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {/* Line cost */}
                        <div className="w-20 text-right text-sm font-mono tabular-nums shrink-0">
                          {formatCurrency(item.lineCost)}
                        </div>

                        {/* Remove button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label={`Remove ${item.ingredientName}`}
                          onClick={() => handleRemoveIngredient(item.ingredientId)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add Ingredient Dropdown */}
              {unusedIngredients.length > 0 && (
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Add Ingredient
                  </Label>
                  <Select onValueChange={handleAddIngredient} value="">
                    <SelectTrigger className="w-full h-10" aria-label="Add ingredient">
                      <SelectValue placeholder="Select ingredient to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unusedIngredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id.toString()}>
                          <span className="flex items-center gap-2">
                            <span>{ing.name}</span>
                            <span className="text-xs text-muted-foreground font-mono tabular-nums">
                              ({formatCurrency(ing.costPerBaseUnit)}/{ing.baseUnit})
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            {/* ── Section: Labor & Overhead ── */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Labor & Overhead</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit-prepTime"
                    className="text-xs text-muted-foreground"
                  >
                    Prep Time (minutes)
                  </Label>
                  <Input
                    id="edit-prepTime"
                    type="number"
                    min="0"
                    value={prepTime || ""}
                    onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="h-10 font-mono tabular-nums"
                  />
                  {prepTime > 0 && (
                    <p className="text-xs text-muted-foreground font-mono tabular-nums">
                      = {formatCurrency(editCosts.laborCost)} at{" "}
                      {formatCurrency(hourlyLaborRate)}/hr
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit-overheadCost"
                    className="text-xs text-muted-foreground"
                  >
                    Overhead Allocation
                  </Label>
                  <Input
                    id="edit-overheadCost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={overheadCost || ""}
                    onChange={(e) =>
                      setOverheadCost(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    className="h-10 font-mono tabular-nums"
                  />
                  <p className="text-xs text-muted-foreground">
                    Per-unit overhead cost
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Section: Cost Summary ── */}
            <div className="rounded-md bg-muted p-4 space-y-2">
              <p className="text-sm font-medium mb-3">Cost Summary</p>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Food Cost</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(editCosts.foodCost)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Labor Cost</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(editCosts.laborCost)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overhead</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(editCosts.overheadCost)}
                </span>
              </div>

              <Separator className="my-2" />

              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Total Cost</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(editCosts.trueCost)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Margin</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums">
                    {formatCurrency(editCosts.trueMargin)}
                  </span>
                  <span
                    className={cn(
                      "font-mono tabular-nums font-medium",
                      marginColorClass(editCosts.trueMarginPercent)
                    )}
                  >
                    {editCosts.trueMarginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Target: {targetMargin}%
              </p>
            </div>
          </div>
        </DetailPanelContent>

        {/* Footer */}
        <DetailPanelFooter>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={onCancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </DetailPanelFooter>
      </>
    )
  }

  // ─── VIEW MODE ─────────────────────────────────────────────────────────────

  // Food cost for view mode
  const foodCost =
    product.trueCost != null
      ? product.trueCost - laborCost - (product.overheadCost ?? 0)
      : null

  return (
    <>
      <DetailPanelHeader
        title={product.name}
        description={product.categoryName}
        actions={
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Edit
          </Button>
        }
      />

      {/* Content - scrollable */}
      <DetailPanelContent className="space-y-6">
        {/* Product Image */}
        {product.image ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
            <Image
              src={getImageSrc(product.image)}
              alt={product.name}
              fill
              className="object-cover"
              unoptimized={isDataUrl(product.image)}
            />
          </div>
        ) : (
          <div className="aspect-video w-full rounded-md bg-muted flex items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}

        {/* Pricing Row */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Pricing</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-semibold font-mono tabular-nums">
                {formatCurrency(product.price)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Price</p>
            </div>
            <div>
              <p className="text-xl font-semibold font-mono tabular-nums">
                {product.trueCost != null ? formatCurrency(product.trueCost) : "-"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Cost</p>
            </div>
            <div>
              <p
                className={cn(
                  "text-xl font-semibold font-mono tabular-nums",
                  product.trueMarginPercent != null &&
                    marginColorClass(product.trueMarginPercent)
                )}
              >
                {product.trueMarginPercent != null
                  ? `${product.trueMarginPercent.toFixed(0)}%`
                  : "-"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Margin{" "}
                {targetMargin && (
                  <span className="text-muted-foreground">
                    (target: {targetMargin}%)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Recipe Section */}
        {product.recipeItems && product.recipeItems.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">
                  Recipe ({product.recipeItems.length})
                </h3>
                {foodCost != null && (
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    Food Cost: {formatCurrency(foodCost)}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                {product.recipeItems.map((item) => {
                  const issue = allIssues.find(
                    (i) => i.id === item.ingredient.id
                  )
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{item.ingredient.name}</span>
                        <span className="text-muted-foreground font-mono tabular-nums shrink-0">
                          {item.quantity} {item.ingredient.baseUnit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground font-mono tabular-nums">
                          {formatCurrency(
                            item.quantity * item.ingredient.costPerBaseUnit
                          )}
                        </span>
                        {issue ? (
                          <StatusDot
                            variant={
                              issue.status === "missing" ? "critical" : "warning"
                            }
                            label={
                              issue.status === "missing"
                                ? `Need ${issue.needPerUnit}/unit`
                                : `${issue.have} left`
                            }
                            className="text-xs"
                          />
                        ) : (
                          <StatusDot variant="ok" label="OK" className="text-xs" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* Stock Summary */}
        <Separator />
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Stock Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Can make</span>
              <span className="font-medium font-mono tabular-nums">
                {product.availability.maxProducible != null
                  ? `${product.availability.maxProducible} units`
                  : "Unlimited"}
              </span>
            </div>

            {product.availability.limitingIngredientDetails && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Limited by</span>
                <span className="text-muted-foreground text-right">
                  {product.availability.limitingIngredientDetails.name} (
                  <span className="font-mono tabular-nums">
                    {product.availability.limitingIngredientDetails.have}
                  </span>{" "}
                  left, need{" "}
                  <span className="font-mono tabular-nums">
                    {product.availability.limitingIngredientDetails.needPerUnit}
                  </span>
                  /unit)
                </span>
              </div>
            )}

            {allIssues.length > 0 && (
              <div className="pt-2 border-t space-y-1.5">
                <p className="text-sm font-medium">
                  Issues ({allIssues.length})
                </p>
                <ul className="space-y-1">
                  {allIssues.map((issue) => (
                    <li
                      key={issue.id}
                      className="text-sm flex justify-between items-center"
                    >
                      <StatusDot
                        variant={
                          issue.status === "missing" ? "critical" : "warning"
                        }
                        label={issue.name}
                      />
                      <span className="text-muted-foreground font-mono tabular-nums">
                        {issue.status === "missing"
                          ? `need ${issue.needPerUnit}/unit`
                          : `${issue.have} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Labor & Overhead */}
        {(product.prepTime || product.overheadCost) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Labor & Overhead</h3>
              <div className="grid grid-cols-2 gap-4">
                {product.prepTime != null && product.prepTime > 0 && (
                  <div>
                    <p className="text-lg font-medium font-mono tabular-nums">
                      {product.prepTime} min
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prep time (
                      <span className="font-mono tabular-nums">
                        {formatCurrency(laborCost)}
                      </span>
                      )
                    </p>
                  </div>
                )}
                {product.overheadCost != null && product.overheadCost > 0 && (
                  <div>
                    <p className="text-lg font-medium font-mono tabular-nums">
                      {formatCurrency(product.overheadCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">Overhead</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DetailPanelContent>

      {/* Status Actions Footer */}
      <DetailPanelFooter>
        <StatusActions
          status={product.status ?? "ACTIVE"}
          productName={product.name}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      </DetailPanelFooter>
    </>
  )
}
