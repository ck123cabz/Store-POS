"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/ingredient-utils"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Ingredient {
  id: number
  name: string
  baseUnit: string
  costPerBaseUnit: number
  category: string
}

interface RecipeIngredient {
  ingredientId: number
  ingredientName: string
  unit: string
  quantity: number
  costPerUnit: number
  lineCost: number
}

interface RecipeData {
  productId: number
  productName: string
  price: number
  prepTime: number | null
  overheadAllocation: number
  ingredients: RecipeIngredient[]
  costs: {
    foodCost: number
    laborCost: number
    overheadCost: number
    trueCost: number
    trueMargin: number
    trueMarginPercent: number
  }
}

interface RecipeEditorProps {
  productId: number
  productName: string
  productPrice: number
  targetMargin?: number
  hourlyLaborRate?: number
  onSave?: () => void
}

export function RecipeEditor({
  productId,
  productName: _productName,
  productPrice,
  targetMargin = 65,
  hourlyLaborRate = 100,
  onSave,
}: RecipeEditorProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])

  // Recipe state
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([])
  const [prepTime, setPrepTime] = useState<number>(0)
  const [overheadCost, setOverheadCost] = useState<number>(0)

  // Calculated costs (real-time)
  const [costs, setCosts] = useState({
    foodCost: 0,
    laborCost: 0,
    overheadCost: 0,
    trueCost: 0,
    trueMargin: 0,
    trueMarginPercent: 0,
  })

  // Fetch recipe and available ingredients
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recipeRes, ingredientsRes] = await Promise.all([
        fetch(`/api/recipes/${productId}`),
        fetch("/api/ingredients"),
      ])

      const ingredientsData: Ingredient[] = await ingredientsRes.json()
      setAvailableIngredients(ingredientsData)

      if (recipeRes.ok) {
        const recipeData: RecipeData = await recipeRes.json()
        setRecipeIngredients(recipeData.ingredients)
        setPrepTime(recipeData.prepTime ?? 0)
        setOverheadCost(recipeData.overheadAllocation ?? 0)
        setCosts(recipeData.costs)
      }
    } catch (error) {
      console.error("Failed to fetch recipe data:", error)
      toast.error("Failed to load recipe")
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Calculate costs whenever recipe changes
  useEffect(() => {
    const foodCost = recipeIngredients.reduce(
      (sum, item) => sum + item.quantity * item.costPerUnit,
      0
    )
    const laborCost = prepTime > 0 ? (prepTime / 60) * hourlyLaborRate : 0
    const trueCost = foodCost + laborCost + overheadCost
    const trueMargin = productPrice - trueCost
    const trueMarginPercent = productPrice > 0 ? (trueMargin / productPrice) * 100 : 0

    setCosts({
      foodCost: Math.round(foodCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      overheadCost: Math.round(overheadCost * 100) / 100,
      trueCost: Math.round(trueCost * 100) / 100,
      trueMargin: Math.round(trueMargin * 100) / 100,
      trueMarginPercent: Math.round(trueMarginPercent * 10) / 10,
    })
  }, [recipeIngredients, prepTime, overheadCost, productPrice, hourlyLaborRate])

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
        unit: ingredient.baseUnit,
        quantity: 1,
        costPerUnit: ingredient.costPerBaseUnit,
        lineCost: ingredient.costPerBaseUnit,
      },
    ])
  }

  const handleQuantityChange = (ingredientId: number, quantity: number) => {
    setRecipeIngredients((prev) =>
      prev.map((item) =>
        item.ingredientId === ingredientId
          ? {
              ...item,
              quantity,
              lineCost: quantity * item.costPerUnit,
            }
          : item
      )
    )
  }

  const handleRemoveIngredient = (ingredientId: number) => {
    setRecipeIngredients((prev) =>
      prev.filter((item) => item.ingredientId !== ingredientId)
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/recipes/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: recipeIngredients.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
          })),
          prepTime: prepTime || null,
          overheadAllocation: overheadCost || null,
        }),
      })

      if (!res.ok) throw new Error("Failed to save recipe")

      toast.success("Recipe saved successfully")
      onSave?.()
    } catch (error) {
      console.error("Failed to save recipe:", error)
      toast.error("Failed to save recipe")
    } finally {
      setSaving(false)
    }
  }

  // Get ingredients not yet in the recipe
  const unusedIngredients = availableIngredients.filter(
    (ing) => !recipeIngredients.some((ri) => ri.ingredientId === ing.id)
  )

  const marginBelowTarget = costs.trueMarginPercent < targetMargin

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cost Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cost Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-lg font-semibold">{formatCurrency(productPrice)}</p>
              <p className="text-xs text-muted-foreground">Price</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{formatCurrency(costs.trueCost)}</p>
              <p className="text-xs text-muted-foreground">Total Cost</p>
            </div>
            <div>
              <p className="text-lg font-semibold">{formatCurrency(costs.trueMargin)}</p>
              <p className="text-xs text-muted-foreground">Margin</p>
            </div>
            <div>
              <p
                className={cn(
                  "text-lg font-semibold",
                  marginBelowTarget && "text-orange-600"
                )}
              >
                {costs.trueMarginPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                Margin % {targetMargin && `(target: ${targetMargin}%)`}
              </p>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="mt-4 pt-3 border-t space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Food Cost</span>
              <span>{formatCurrency(costs.foodCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Labor Cost</span>
              <span>{formatCurrency(costs.laborCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overhead</span>
              <span>{formatCurrency(costs.overheadCost)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Ingredients ({recipeIngredients.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recipeIngredients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No ingredients in recipe. Add ingredients below.
            </p>
          ) : (
            <div className="space-y-2">
              {recipeIngredients.map((item) => (
                <div
                  key={item.ingredientId}
                  className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.ingredientName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.costPerUnit)}/{item.unit}
                    </p>
                  </div>
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
                      className="w-20 h-8 text-right"
                    />
                    <span className="text-xs text-muted-foreground w-8">
                      {item.unit}
                    </span>
                  </div>
                  <div className="w-16 text-right text-sm">
                    {formatCurrency(item.lineCost)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveIngredient(item.ingredientId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
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

      {/* Prep Time & Overhead */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Labor & Overhead</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prepTime" className="text-sm">
                Prep Time (minutes)
              </Label>
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
                  = {formatCurrency(costs.laborCost)} at {formatCurrency(hourlyLaborRate)}/hr
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="overheadCost" className="text-sm">
                Overhead Allocation
              </Label>
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

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Save Recipe
          </>
        )}
      </Button>
    </div>
  )
}
