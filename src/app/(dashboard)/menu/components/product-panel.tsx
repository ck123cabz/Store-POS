"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Pencil, Trash2, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { formatCurrency } from "@/lib/ingredient-utils"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Image from "next/image"

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
}: ProductPanelProps) {
  const marginBelowTarget =
    product.trueMarginPercent != null && product.trueMarginPercent < targetMargin

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

  const handleUnitChange = (ingredientId: number, newUnit: string) => {
    setRecipeIngredients((prev) =>
      prev.map((item) => {
        if (item.ingredientId !== ingredientId) return item

        // Get multiplier for new unit
        let multiplier = 1
        if (newUnit !== item.baseUnit) {
          const alias = item.unitAliases.find((a) => a.name === newUnit)
          multiplier = alias?.baseUnitMultiplier || 1
        }

        // Recalculate baseQuantity
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

        // Get multiplier for current unit
        let multiplier = 1
        if (item.unit !== item.baseUnit) {
          const alias = item.unitAliases.find((a) => a.name === item.unit)
          multiplier = alias?.baseUnitMultiplier || 1
        }

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

  const editMarginBelowTarget = editCosts.trueMarginPercent < targetMargin

  // EDIT MODE
  if (editMode) {
    if (loadingEditData) {
      return (
        <div className="h-full flex flex-col border-l bg-background">
          <div className="flex items-center justify-between p-4 border-b">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" disabled>
                Save
              </Button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      )
    }

    return (
      <div className="h-full flex flex-col border-l bg-background">
        {/* Header - Edit Mode */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
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
        </div>

        {/* Content - Edit Mode */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Basic Info */}
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Product name"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.categoryId.toString()}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, categoryId: parseInt(v) }))}
              >
                <SelectTrigger>
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

            {/* Image */}
            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-4">
                {(imagePreview || product.image) ? (
                  <Image
                    src={imagePreview || product.image}
                    alt={product.name}
                    width={64}
                    height={64}
                    className="rounded object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
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

          {/* Pricing Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              {/* Cost Summary */}
              <div className="grid grid-cols-3 gap-4 text-center pt-2 border-t">
                <div>
                  <p className="text-lg font-semibold">{formatCurrency(editCosts.trueCost)}</p>
                  <p className="text-xs text-muted-foreground">Cost</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{formatCurrency(editCosts.trueMargin)}</p>
                  <p className="text-xs text-muted-foreground">Margin</p>
                </div>
                <div>
                  <p
                    className={cn(
                      "text-lg font-semibold",
                      editMarginBelowTarget && "text-orange-600"
                    )}
                  >
                    {editCosts.trueMarginPercent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {targetMargin && `(target: ${targetMargin}%)`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipe Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Recipe ({recipeIngredients.length} ingredients)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recipeIngredients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No ingredients in recipe. Add ingredients below.
                </p>
              ) : (
                <div className="space-y-2">
                  {recipeIngredients.map((item) => {
                    // Build available units list
                    const availableUnits = [
                      { name: item.baseUnit, multiplier: 1 },
                      ...item.unitAliases.map((a) => ({
                        name: a.name,
                        multiplier: a.baseUnitMultiplier,
                      })),
                    ]
                    const showUnitDropdown = availableUnits.length > 1
                    const showConversion = item.unit !== item.baseUnit

                    return (
                      <div
                        key={item.ingredientId}
                        className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
                      >
                        {/* Ingredient name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.ingredientName}
                          </p>
                          <p className="text-xs text-muted-foreground">
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
                            className="w-16 h-8 text-right"
                          />

                          {showUnitDropdown ? (
                            <Select
                              value={item.unit}
                              onValueChange={(v) => handleUnitChange(item.ingredientId, v)}
                            >
                              <SelectTrigger className="w-20 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableUnits.map((u) => (
                                  <SelectItem key={u.name} value={u.name}>
                                    {u.name}
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
                                  <p>= {item.baseQuantity.toFixed(2)} {item.baseUnit} (raw)</p>
                                  {item.yieldFactor && item.yieldFactor > 0 && (
                                    <p>
                                      ≈ {(item.baseQuantity * item.yieldFactor).toFixed(2)}{" "}
                                      {item.baseUnit} (cooked)
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {/* Line cost */}
                        <div className="w-16 text-right text-sm">
                          {formatCurrency(item.lineCost)}
                        </div>

                        {/* Remove button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveIngredient(item.ingredientId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add Ingredient Dropdown */}
              {unusedIngredients.length > 0 && (
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Add Ingredient
                  </Label>
                  <Select onValueChange={handleAddIngredient} value="">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select ingredient to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unusedIngredients.map((ing) => (
                        <SelectItem key={ing.id} value={ing.id.toString()}>
                          <span className="flex items-center gap-2">
                            <span>{ing.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({formatCurrency(ing.costPerBaseUnit)}/{ing.baseUnit})
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Labor & Overhead Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Labor & Overhead</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prepTime">Prep Time (minutes)</Label>
                  <Input
                    id="prepTime"
                    type="number"
                    min="0"
                    value={prepTime || ""}
                    onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  {prepTime > 0 && (
                    <p className="text-xs text-muted-foreground">
                      = {formatCurrency(editCosts.laborCost)} at {formatCurrency(hourlyLaborRate)}/hr
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overheadCost">Overhead Allocation</Label>
                  <Input
                    id="overheadCost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={overheadCost || ""}
                    onChange={(e) => setOverheadCost(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Per-unit overhead cost
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer - Edit Mode */}
        <div className="p-4 border-t">
          <Button variant="destructive" size="sm" className="w-full">
            Delete Product
          </Button>
        </div>
      </div>
    )
  }

  // VIEW MODE
  return (
    <div className="h-full flex flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Product Header */}
        <div className="flex items-start gap-4">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={64}
              height={64}
              className="rounded object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <Badge variant="outline">{product.categoryName}</Badge>
          </div>
        </div>

        {/* Pricing Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(product.price)}
                </p>
                <p className="text-xs text-muted-foreground">Price</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {product.trueCost != null
                    ? formatCurrency(product.trueCost)
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">Cost</p>
              </div>
              <div>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    marginBelowTarget && "text-orange-600"
                  )}
                >
                  {product.trueMarginPercent != null
                    ? `${product.trueMarginPercent.toFixed(0)}%`
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Margin {targetMargin && `(target: ${targetMargin}%)`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipe Card */}
        {product.recipeItems && product.recipeItems.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium">
                  Recipe - {product.recipeItems.length} ingredients
                </CardTitle>
                {product.trueCost != null && (
                  <span className="text-sm text-muted-foreground">
                    Food Cost: {formatCurrency(product.trueCost - laborCost - (product.overheadCost ?? 0))}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {product.recipeItems.map((item) => {
                  const issue = allIssues.find(
                    (i) => i.id === item.ingredient.id
                  )
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{item.ingredient.name}</span>
                        <span className="text-muted-foreground">
                          {item.quantity} {item.ingredient.baseUnit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {formatCurrency(
                            item.quantity * item.ingredient.costPerBaseUnit
                          )}
                        </span>
                        {issue ? (
                          <Badge
                            variant={
                              issue.status === "missing"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {issue.status === "missing"
                              ? `Missing ${issue.needPerUnit}/unit`
                              : `${issue.have} left`}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-50 text-green-700"
                          >
                            OK
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stock Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stock Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Can make:</span>
              <span className="font-medium">
                {product.availability.maxProducible != null
                  ? `${product.availability.maxProducible} units`
                  : "Unlimited"}
              </span>
            </div>

            {product.availability.limitingIngredientDetails && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Limited by:</span>
                <span>
                  {product.availability.limitingIngredientDetails.name} (
                  {product.availability.limitingIngredientDetails.have} left,
                  need {product.availability.limitingIngredientDetails.needPerUnit}
                  /unit)
                </span>
              </div>
            )}

            {allIssues.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">
                  Issues ({allIssues.length}):
                </p>
                <ul className="space-y-1">
                  {allIssues.map((issue) => (
                    <li
                      key={issue.id}
                      className="text-sm flex justify-between"
                    >
                      <span
                        className={cn(
                          issue.status === "missing"
                            ? "text-red-600"
                            : "text-yellow-600"
                        )}
                      >
                        {issue.name}
                      </span>
                      <span className="text-muted-foreground">
                        {issue.status === "missing"
                          ? `need ${issue.needPerUnit}/unit`
                          : `${issue.have} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Labor & Overhead Card */}
        {(product.prepTime || product.overheadCost) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Labor & Overhead
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {product.prepTime && (
                  <div>
                    <p className="text-lg font-medium">{product.prepTime} min</p>
                    <p className="text-xs text-muted-foreground">
                      Prep time ({formatCurrency(laborCost)})
                    </p>
                  </div>
                )}
                {product.overheadCost && (
                  <div>
                    <p className="text-lg font-medium">
                      {formatCurrency(product.overheadCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">Overhead</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button variant="destructive" size="sm" className="w-full">
          Delete Product
        </Button>
      </div>
    </div>
  )
}
