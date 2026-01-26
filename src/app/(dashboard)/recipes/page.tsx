"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, ChefHat, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface ProductWithRecipe {
  id: number
  name: string
  price: number
  categoryName: string
  trueCost: number | null
  trueMargin: number | null
  trueMarginPercent: number | null
  ingredientCount: number
}

export default function RecipesPage() {
  const [products, setProducts] = useState<ProductWithRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [targetMargin, setTargetMargin] = useState(65)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [productsRes, settingsRes] = await Promise.all([
        fetch("/api/recipes"),
        fetch("/api/settings"),
      ])
      setProducts(await productsRes.json())
      const settings = await settingsRes.json()
      setTargetMargin(settings.targetTrueMarginPercent || 65)
    } catch {
      toast.error("Failed to load recipes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Recipes</h1>
        <p className="text-muted-foreground">
          Manage product recipes and track food costs
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-center">Ingredients</TableHead>
            <TableHead className="text-right">Food Cost</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Margin</TableHead>
            <TableHead className="w-24">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const belowTarget =
              product.trueMarginPercent !== null &&
              product.trueMarginPercent < targetMargin
            const hasRecipe = product.ingredientCount > 0

            return (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{product.categoryName}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  {hasRecipe ? (
                    <Badge>{product.ingredientCount}</Badge>
                  ) : (
                    <Badge variant="secondary">None</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {product.trueCost !== null ? (
                    `P${product.trueCost.toFixed(2)}`
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  P{product.price.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {product.trueMarginPercent !== null ? (
                    <span className={belowTarget ? "text-orange-600" : "text-green-600"}>
                      {belowTarget && <AlertTriangle className="h-4 w-4 inline mr-1" />}
                      {product.trueMarginPercent.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Link href={`/recipes/${product.id}`}>
                    <Button size="sm" variant="outline">
                      <ChefHat className="h-4 w-4 mr-1" />
                      {hasRecipe ? "Edit" : "Build"}
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
