"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, Trash2, RefreshCw, AlertTriangle, Save } from "lucide-react"
import { toast } from "sonner"

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

interface Ingredient {
  id: number
  name: string
  unit: string
  costPerUnit: number
  quantity: number
  stockStatus: string
}

export default function RecipeBuilderPage() {
  const params = useParams()
  const productId = params.productId as string

  const [recipe, setRecipe] = useState<RecipeData | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable state
  const [recipeItems, setRecipeItems] = useState<RecipeIngredient[]>([])
  const [prepTime, setPrepTime] = useState<string>("")
  const [overhead, setOverhead] = useState<string>("")

  // Settings for margin warning and display
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(65)
  const [currencySymbol, setCurrencySymbol] = useState<string>("₱")
  const [hourlyRate, setHourlyRate] = useState<number>(75)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recipeRes, ingredientsRes, settingsRes] = await Promise.all([
        fetch(`/api/recipes/${productId}`),
        fetch("/api/ingredients"),
        fetch("/api/settings"),
      ])

      if (!recipeRes.ok) throw new Error("Product not found")

      const recipeData = await recipeRes.json()
      const ingredientsData = await ingredientsRes.json()
      const settingsData = await settingsRes.json()

      setRecipe(recipeData)
      setIngredients(ingredientsData)
      setRecipeItems(recipeData.ingredients || [])
      setPrepTime(recipeData.prepTime?.toString() || "")
      setOverhead(recipeData.overheadAllocation?.toString() || "0")
      setTargetMarginPercent(settingsData.targetTrueMarginPercent || 65)
      setCurrencySymbol(settingsData.currencySymbol || "₱")
      setHourlyRate(settingsData.avgHourlyLaborCost || 75)
    } catch (error) {
      console.error(error)
      toast.error("Failed to load recipe data")
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate costs in real-time
  const calculateCosts = useCallback(() => {
    if (!recipe) return null

    const foodCost = recipeItems.reduce((sum, item) => sum + item.lineCost, 0)
    const laborCost = prepTime ? (parseFloat(prepTime) / 60) * hourlyRate : 0
    const overheadCost = parseFloat(overhead) || 0
    const trueCost = foodCost + laborCost + overheadCost
    const price = recipe.price
    const trueMargin = price - trueCost
    const trueMarginPercent = price > 0 ? (trueMargin / price) * 100 : 0

    return {
      foodCost: Math.round(foodCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      overheadCost: Math.round(overheadCost * 100) / 100,
      trueCost: Math.round(trueCost * 100) / 100,
      trueMargin: Math.round(trueMargin * 100) / 100,
      trueMarginPercent: Math.round(trueMarginPercent * 10) / 10,
    }
  }, [recipe, recipeItems, prepTime, overhead, hourlyRate])

  const costs = calculateCosts()
  const isBelowTarget = costs && costs.trueMarginPercent < targetMarginPercent

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/recipes/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prepTime: prepTime ? parseInt(prepTime) : null,
          overheadAllocation: parseFloat(overhead) || 0,
          ingredients: recipeItems.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
          })),
        }),
      })

      if (!res.ok) throw new Error("Failed to save")

      toast.success("Recipe saved successfully")
      fetchData() // Refresh to get updated costs from server
    } catch {
      toast.error("Failed to save recipe")
    } finally {
      setSaving(false)
    }
  }

  function updateIngredientQuantity(ingredientId: number, newQuantity: number) {
    setRecipeItems((prev) =>
      prev.map((item) => {
        if (item.ingredientId === ingredientId) {
          return {
            ...item,
            quantity: newQuantity,
            lineCost: newQuantity * item.costPerUnit,
          }
        }
        return item
      })
    )
  }

  function removeIngredient(ingredientId: number) {
    setRecipeItems((prev) => prev.filter((item) => item.ingredientId !== ingredientId))
  }

  function addIngredient(ingredient: Ingredient) {
    // Check if already added
    if (recipeItems.some((item) => item.ingredientId === ingredient.id)) {
      toast.error("Ingredient already in recipe")
      return
    }

    setRecipeItems((prev) => [
      ...prev,
      {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        quantity: 1,
        costPerUnit: ingredient.costPerUnit,
        lineCost: ingredient.costPerUnit,
      },
    ])
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="p-6">
        <p>Product not found</p>
        <Link href="/products">
          <Button variant="ghost" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Products
          </Button>
        </Link>
      </div>
    )
  }

  // Get available ingredients (not already in recipe)
  const availableIngredients = ingredients.filter(
    (ing) => !recipeItems.some((item) => item.ingredientId === ing.id)
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{recipe.productName}</h1>
            <p className="text-muted-foreground">Recipe Builder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">
            Price: {currencySymbol}{recipe.price.toFixed(2)}
          </span>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Recipe"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recipe Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recipe Ingredients</CardTitle>
              <CardDescription>
                Add ingredients and specify quantities for this product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="w-32">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Line Cost</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipeItems.map((item) => (
                    <TableRow key={item.ingredientId}>
                      <TableCell className="font-medium">
                        {item.ingredientName}
                        <span className="text-muted-foreground ml-1">({item.unit})</span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={item.quantity}
                          onChange={(e) =>
                            updateIngredientQuantity(
                              item.ingredientId,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {currencySymbol}{item.costPerUnit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {currencySymbol}{item.lineCost.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeIngredient(item.ingredientId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {recipeItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No ingredients added. Select from the list on the right.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Prep Time & Overhead */}
          <Card>
            <CardHeader>
              <CardTitle>Labor & Overhead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prepTime">Prep Time (minutes)</Label>
                  <Input
                    id="prepTime"
                    type="number"
                    min="0"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to calculate labor cost
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overhead">Overhead Allocation ({currencySymbol})</Label>
                  <Input
                    id="overhead"
                    type="number"
                    step="0.01"
                    min="0"
                    value={overhead}
                    onChange={(e) => setOverhead(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Packaging, gas, etc.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Cost Summary & Ingredient Picker */}
        <div className="space-y-4">
          {/* Cost Summary */}
          <Card className={isBelowTarget ? "border-orange-500" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                Cost Summary
                {isBelowTarget && (
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                )}
              </CardTitle>
              {isBelowTarget && (
                <CardDescription className="text-orange-600">
                  Margin below target ({targetMarginPercent}%)
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Food Cost</span>
                <span>{currencySymbol}{costs?.foodCost.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Labor Cost</span>
                <span>{currencySymbol}{costs?.laborCost.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Overhead</span>
                <span>{currencySymbol}{costs?.overheadCost.toFixed(2) || "0.00"}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>True Cost</span>
                <span>{currencySymbol}{costs?.trueCost.toFixed(2) || "0.00"}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span>Selling Price</span>
                  <span>{currencySymbol}{recipe.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg mt-1">
                  <span>Margin</span>
                  <span className={isBelowTarget ? "text-orange-600" : "text-green-600"}>
                    {currencySymbol}{costs?.trueMargin.toFixed(2) || "0.00"} ({costs?.trueMarginPercent.toFixed(1) || "0"}%)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingredient Picker */}
          <Card>
            <CardHeader>
              <CardTitle>Add Ingredient</CardTitle>
              <CardDescription>
                Click to add to recipe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableIngredients.map((ingredient) => (
                  <Button
                    key={ingredient.id}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => addIngredient(ingredient)}
                  >
                    <span>{ingredient.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {currencySymbol}{ingredient.costPerUnit.toFixed(2)}/{ingredient.unit}
                    </span>
                  </Button>
                ))}
                {availableIngredients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All ingredients are in the recipe
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
