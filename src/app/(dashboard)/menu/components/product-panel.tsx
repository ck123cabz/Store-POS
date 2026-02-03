"use client"

import { X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/ingredient-utils"
import { cn } from "@/lib/utils"
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

interface ProductPanelProps {
  product: Product
  onClose: () => void
  onEdit: () => void
  targetMargin?: number
  hourlyLaborRate?: number
}

export function ProductPanel({
  product,
  onClose,
  onEdit,
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
                  Recipe · {product.recipeItems.length} ingredients
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
