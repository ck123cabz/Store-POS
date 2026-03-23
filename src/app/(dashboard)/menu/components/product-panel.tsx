"use client"

import { useState, useEffect, useCallback } from "react"
import { Pencil, Loader2, Info, Minus, ChefHat, Package, XIcon, ImageIcon } from "lucide-react"
import { Switch } from "@/components/ui/switch"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import {
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
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
import { Combobox } from "@/components/ui/combobox"
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
  linkedVariantId?: number | null
  availability: {
    status: "available" | "low" | "critical" | "out"
    maxProducible: number | null
    limitingIngredientDetails?: IngredientShortage | null
    missingIngredients: IngredientShortage[]
    lowIngredients: IngredientShortage[]
  }
  status?: string
  requiresKitchen?: boolean | null
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
  unitId?: number | null  // unit record id (for persistence)
  unit: string            // chosen unit name
  baseUnit: string        // ingredient's base unit
  baseQuantity: number    // converted to base units
  costPerBaseUnit: number     // cost per base unit
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
  /** When true, renders without DetailPanel wrapper (used inside mobile Sheet) */
  isMobile?: boolean
}

/** Returns the semantic margin color class based on margin percentage thresholds */
function marginColorClass(marginPercent: number): string {
  if (marginPercent >= 65) return "text-status-ok"
  if (marginPercent >= 50) return "text-status-warning"
  return "text-status-critical"
}

function MetricCard({
  label,
  value,
  highlight,
  valueClassName,
  className,
}: {
  label: string
  value: string
  highlight?: boolean
  valueClassName?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-center",
        highlight && "bg-status-ok/10 border-status-ok/30",
        className
      )}
    >
      <p className={cn("text-lg font-semibold font-mono tabular-nums", valueClassName)}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

/** Renders the colored margin badge pill for the compact header */
function MarginBadge({ marginPercent, compact }: { marginPercent: number; compact?: boolean }) {
  const badgeColor =
    marginPercent >= 50
      ? "bg-status-ok/15 text-status-ok border-status-ok/30"
      : marginPercent >= 30
        ? "bg-status-warning/15 text-status-warning border-status-warning/30"
        : "bg-status-critical/15 text-status-critical border-status-critical/30"

  return (
    <Badge
      variant="secondary"
      className={cn("shrink-0 border", badgeColor, compact && "text-[10px]")}
    >
      {marginPercent.toFixed(0)}% margin
    </Badge>
  )
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
      actions.push({ label: "Delete", isDelete: true, variant: "destructive" })
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
  onClose: _onClose,
  onEdit,
  onCancelEdit,
  onSaveSuccess,
  editMode = false,
  categories = [],
  targetMargin = 65,
  hourlyLaborRate = 100,
  onStatusChange,
  onDelete,
  isMobile = false,
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
    linkedVariantId: product.linkedVariantId ?? null as number | null,
    requiresKitchen: product.requiresKitchen ?? null as boolean | null,
  })
  const [variantOptions, setVariantOptions] = useState<{ id: number; label: string }[]>([])
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

      const ingredientsRaw = await ingredientsRes.json()
      // Map API field names to component's Ingredient interface
      const ingredientsData: Ingredient[] = (ingredientsRaw || []).map((i: {
        id: number; name: string; baseUnitName?: string; baseUnit?: string;
        avgCostPerBaseUnit?: number; costPerBaseUnit?: number;
        category: string; yieldFactor: number | null;
        unitAliases?: UnitAlias[];
      }) => ({
        id: i.id,
        name: i.name,
        baseUnit: i.baseUnitName ?? i.baseUnit ?? '',
        costPerBaseUnit: i.avgCostPerBaseUnit ?? i.costPerBaseUnit ?? 0,
        category: i.category,
        yieldFactor: i.yieldFactor,
        unitAliases: i.unitAliases || [],
      }))
      setAvailableIngredients(ingredientsData)

      // Build variant options for the linked variant combobox
      const opts: { id: number; label: string }[] = []
      for (const ing of ingredientsRaw || []) {
        if (ing.purchaseVariants) {
          for (const v of ing.purchaseVariants) {
            opts.push({
              id: v.id,
              label: `${ing.name} — ${v.label} (${ing.baseUnitName || ing.baseUnit || ''})`,
            })
          }
        }
      }
      setVariantOptions(opts)

      if (recipeRes.ok) {
        const recipeData = await recipeRes.json()
        // Map API field names to RecipeIngredient interface
        const mapped = (recipeData.ingredients || []).map((ri: {
          ingredientId: number
          ingredientName: string
          quantity: number
          unitId?: number | null
          unitName?: string
          baseUnitName: string
          baseQuantity: number
          costPerBaseUnit: number
          lineCost: number
          yieldFactor: number | null
          unitAliases: UnitAlias[]
        }) => ({
          ingredientId: ri.ingredientId,
          ingredientName: ri.ingredientName,
          quantity: ri.quantity,
          unitId: ri.unitId ?? null,
          unit: ri.unitName ?? ri.baseUnitName,
          baseUnit: ri.baseUnitName,
          baseQuantity: ri.baseQuantity,
          costPerBaseUnit: ri.costPerBaseUnit,
          lineCost: ri.lineCost,
          yieldFactor: ri.yieldFactor,
          unitAliases: ri.unitAliases || [],
        }))
        setRecipeIngredients(mapped)
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
        linkedVariantId: product.linkedVariantId ?? null,
        requiresKitchen: product.requiresKitchen ?? null,
      })
      setImageFile(null)
      setImagePreview(null)
      void fetchEditData()
    }
  }, [editMode, product.name, product.price, product.categoryId, product.linkedVariantId, product.requiresKitchen, fetchEditData])

  // Calculate costs whenever recipe changes in edit mode
  useEffect(() => {
    if (!editMode) return

    const price = parseFloat(formData.price) || 0
    const foodCost = recipeIngredients.reduce(
      (sum, item) => sum + item.baseQuantity * item.costPerBaseUnit,
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
        costPerBaseUnit: ingredient.costPerBaseUnit,
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
          lineCost: baseQuantity * item.costPerBaseUnit,
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
          lineCost: baseQuantity * item.costPerBaseUnit,
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
        linkedVariantId: formData.linkedVariantId,
        requiresKitchen: formData.requiresKitchen,
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
            unitId: item.unitId ?? null,
            unitName: item.unit,  // fallback: API resolves name → id
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
      const loadingSkeleton = (
        <div className="space-y-4 p-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      )
      const loadingFooter = (
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={onCancelEdit} disabled>
            Cancel
          </Button>
          <Button disabled>Save</Button>
        </div>
      )

      if (isMobile) {
        return (
          <>
            <div className="flex items-center gap-2 border-b px-5 py-3.5">
              <span className="text-base font-semibold">Edit {product.name}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {loadingSkeleton}
            </div>
            <div className="border-t bg-background p-4 shrink-0">
              {loadingFooter}
            </div>
          </>
        )
      }

      return (
        <>
          <DetailPanelHeader title={`Edit ${product.name}`} />
          <DetailPanelContent>
            {loadingSkeleton}
          </DetailPanelContent>
          <DetailPanelFooter>
            {loadingFooter}
          </DetailPanelFooter>
        </>
      )
    }

    const editContentInner = (
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
                <Label className="text-sm font-medium">Linked Variant</Label>
                <Combobox<number>
                  options={variantOptions.map((v) => ({
                    value: v.id,
                    label: v.label,
                  }))}
                  value={formData.linkedVariantId}
                  onChange={(v) =>
                    setFormData((prev) => ({ ...prev, linkedVariantId: v }))
                  }
                  placeholder="Select variant (optional)"
                  searchPlaceholder="Search variants..."
                  emptyMessage="No variants found."
                  icon={<Package className="size-4" />}
                />
                <p className="text-xs text-muted-foreground">
                  Link to a purchase variant for automatic stock tracking.
                </p>
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

            {/* ── Section: Kitchen Order ── */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <ChefHat className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <Label className="text-sm font-medium">Send to Kitchen</Label>
                  <p className="text-xs text-muted-foreground">
                    {formData.requiresKitchen === null
                      ? "Using category default"
                      : formData.requiresKitchen
                        ? "Always sent to kitchen"
                        : "Never sent to kitchen"}
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.requiresKitchen === true}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, requiresKitchen: checked }))
                }
                aria-label="Send to kitchen"
              />
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
                            {formatCurrency(item.costPerBaseUnit)}/{item.baseUnit}
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
                  <Select key={recipeIngredients.length} onValueChange={handleAddIngredient}>
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
    )

    const editFooter = (
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
    )

    if (isMobile) {
      return (
        <>
          <div className="flex items-center gap-2 border-b px-5 py-3.5">
            <span className="text-base font-semibold truncate">Edit {product.name}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {editContentInner}
          </div>
          <div className="border-t bg-background p-4 shrink-0">
            {editFooter}
          </div>
        </>
      )
    }

    return (
      <>
        <DetailPanelHeader title={`Edit ${product.name}`} />
        <DetailPanelContent>
          {editContentInner}
        </DetailPanelContent>
        <DetailPanelFooter>
          {editFooter}
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

  const viewContentInner = (
    <Tabs defaultValue="overview">
      <TabsList className="w-full grid grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="recipe">Recipe</TabsTrigger>
        <TabsTrigger value="costs">Costs</TabsTrigger>
        <TabsTrigger value="image">Image</TabsTrigger>
      </TabsList>

      {/* ── OVERVIEW TAB ── */}
      <TabsContent value="overview" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Price"
            value={formatCurrency(product.price)}
          />
          <MetricCard
            label="Total Cost"
            value={product.trueCost != null ? formatCurrency(product.trueCost) : "-"}
          />
          <MetricCard
            label="Margin"
            value={
              product.trueMarginPercent != null
                ? `${product.trueMarginPercent.toFixed(0)}%`
                : "-"
            }
            highlight={product.trueMarginPercent != null && product.trueMarginPercent >= 50}
            valueClassName={
              product.trueMarginPercent != null
                ? marginColorClass(product.trueMarginPercent)
                : undefined
            }
          />
          <MetricCard
            label="Can Make"
            value={
              product.availability.maxProducible != null
                ? `${product.availability.maxProducible}`
                : "\u221E"
            }
          />
        </div>

        {/* Limiting ingredient note */}
        {product.availability.limitingIngredientDetails && (
          <p className="text-xs text-muted-foreground">
            Limited by{" "}
            <span className="font-medium text-foreground">
              {product.availability.limitingIngredientDetails.name}
            </span>{" "}
            ({product.availability.limitingIngredientDetails.have} left, need{" "}
            {product.availability.limitingIngredientDetails.needPerUnit}/unit)
          </p>
        )}

        {/* Stock issues */}
        {allIssues.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-status-warning">
              Stock Issues
            </p>
            <ul className="space-y-1.5">
              {allIssues.map((issue) => (
                <li key={issue.id} className="text-sm flex items-center justify-between">
                  <StatusDot
                    variant={issue.status === "missing" ? "critical" : "warning"}
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
      </TabsContent>

      {/* ── RECIPE TAB ── */}
      <TabsContent value="recipe" className="mt-4">
        {product.recipeItems && product.recipeItems.length > 0 ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">
                Ingredients ({product.recipeItems.length})
              </p>
              {foodCost != null && (
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  Food Cost: {formatCurrency(foodCost)}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {product.recipeItems.map((item) => {
                const issue = allIssues.find((i) => i.id === item.ingredient.id)
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
                        {formatCurrency(item.quantity * item.ingredient.costPerBaseUnit)}
                      </span>
                      {issue ? (
                        <StatusDot
                          variant={issue.status === "missing" ? "critical" : "warning"}
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
        ) : (
          <EmptyState
            icon={<ChefHat className="h-10 w-10" />}
            title="No recipe"
            description="Edit this product to add ingredients."
          />
        )}
      </TabsContent>

      {/* ── COSTS TAB ── */}
      <TabsContent value="costs" className="mt-4">
        <div className="rounded-md bg-muted/50 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Food Cost</span>
            <span className="font-mono tabular-nums">
              {foodCost != null ? formatCurrency(foodCost) : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Labor Cost</span>
            <span className="font-mono tabular-nums">
              {laborCost > 0 ? formatCurrency(laborCost) : "-"}
            </span>
          </div>
          {product.prepTime != null && product.prepTime > 0 && (
            <p className="text-xs text-muted-foreground pl-2">
              {product.prepTime} min @ {formatCurrency(hourlyLaborRate)}/hr
            </p>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overhead</span>
            <span className="font-mono tabular-nums">
              {product.overheadCost ? formatCurrency(product.overheadCost) : "-"}
            </span>
          </div>

          <Separator className="my-2" />

          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total Cost</span>
            <span className="font-mono tabular-nums">
              {product.trueCost != null ? formatCurrency(product.trueCost) : "-"}
            </span>
          </div>

          <Separator className="my-2" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Price</span>
            <span className="font-mono tabular-nums">{formatCurrency(product.price)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Margin</span>
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums">
                {product.trueMargin != null ? formatCurrency(product.trueMargin) : "-"}
              </span>
              {product.trueMarginPercent != null && (
                <span
                  className={cn(
                    "font-mono tabular-nums font-medium",
                    marginColorClass(product.trueMarginPercent)
                  )}
                >
                  {product.trueMarginPercent.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Target: {targetMargin}%
          </p>
        </div>
      </TabsContent>

      {/* ── IMAGE TAB ── */}
      <TabsContent value="image" className="mt-4">
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
          <EmptyState
            icon={<ImageIcon className="h-10 w-10" />}
            title="No image"
            description="Edit this product to upload an image."
          />
        )}
      </TabsContent>
    </Tabs>
  )

  const viewFooter = (
    <StatusActions
      status={product.status ?? "ACTIVE"}
      productName={product.name}
      onStatusChange={onStatusChange}
      onDelete={onDelete}
    />
  )

  if (isMobile) {
    return (
      <>
        {/* Mobile compact header */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {/* Thumbnail */}
          {product.image ? (
            <div className="relative size-10 rounded-lg overflow-hidden bg-muted shrink-0">
              <Image
                src={getImageSrc(product.image)}
                alt={product.name}
                fill
                className="object-cover"
                unoptimized={isDataUrl(product.image)}
              />
            </div>
          ) : (
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Package className="size-4 text-muted-foreground" />
            </div>
          )}

          {/* Name + category */}
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate">
              {product.name}
              <span className="ml-2 font-mono tabular-nums text-sm font-normal text-muted-foreground">
                {formatCurrency(product.price)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground truncate">{product.categoryName}</p>
          </div>

          {/* Margin badge */}
          {product.trueMarginPercent != null && (
            <MarginBadge marginPercent={product.trueMarginPercent} compact />
          )}

          {/* Edit button */}
          <Button variant="ghost" size="sm" onClick={onEdit} className="shrink-0">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {viewContentInner}
        </div>
        <div className="border-t bg-background p-4 shrink-0">
          {viewFooter}
        </div>
      </>
    )
  }

  return (
    <>
      {/* Compact avatar header */}
      <div className="flex items-center gap-3 border-b px-5 py-3.5">
        {/* Thumbnail */}
        {product.image ? (
          <div className="relative size-10 rounded-lg overflow-hidden bg-muted shrink-0">
            <Image
              src={getImageSrc(product.image)}
              alt={product.name}
              fill
              className="object-cover"
              unoptimized={isDataUrl(product.image)}
            />
          </div>
        ) : (
          <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Package className="size-4 text-muted-foreground" />
          </div>
        )}

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <DialogTitle className="text-base font-semibold truncate">
            {product.name}
            <span className="ml-2 font-mono tabular-nums text-sm font-normal text-muted-foreground">
              {formatCurrency(product.price)}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground truncate">
            {product.categoryName}
          </DialogDescription>
        </div>

        {/* Margin badge */}
        {product.trueMarginPercent != null && (
          <MarginBadge marginPercent={product.trueMarginPercent} />
        )}

        {/* Edit button */}
        <Button variant="ghost" size="sm" onClick={onEdit} className="shrink-0">
          <Pencil className="h-4 w-4 mr-1.5" />
          Edit
        </Button>

        {/* Close button */}
        <DialogClose className="ring-offset-background focus:ring-ring rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none shrink-0 ml-1">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </div>

      <DetailPanelContent>
        {viewContentInner}
      </DetailPanelContent>
      <DetailPanelFooter>
        {viewFooter}
      </DetailPanelFooter>
    </>
  )
}
