"use client"

import Image from "next/image"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { StockBadge } from "./stock-badge"
import { formatCurrency } from "@/lib/ingredient-utils"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface IngredientShortage {
  id: number
  name: string
  have: number
  needPerUnit: number
  status: "missing" | "low"
}

interface Product {
  id: number
  name: string
  price: number
  categoryId: number
  categoryName: string
  image: string
  trueCost?: number | null
  trueMarginPercent?: number | null
  recipeItemCount?: number
  availability: {
    status: "available" | "low" | "critical" | "out"
    maxProducible: number | null
    missingIngredients: IngredientShortage[]
    lowIngredients: IngredientShortage[]
  }
}

interface ProductsTableProps {
  products: Product[]
  selectedId: number | null
  onSelect: (product: Product) => void
  targetMargin?: number
}

export function ProductsTable({
  products,
  selectedId,
  onSelect,
  targetMargin = 65,
}: ProductsTableProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No products found. Add your first product to get started.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 hidden sm:table-cell">Image</TableHead>
          <TableHead>Product</TableHead>
          <TableHead className="w-20 hidden md:table-cell">Price</TableHead>
          <TableHead className="w-20 hidden lg:table-cell">Cost</TableHead>
          <TableHead className="w-20 hidden lg:table-cell">Margin</TableHead>
          <TableHead className="w-20 hidden md:table-cell">Recipe</TableHead>
          <TableHead className="w-40">Stock</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const marginBelowTarget =
            product.trueMarginPercent != null &&
            product.trueMarginPercent < targetMargin

          return (
            <TableRow
              key={product.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                selectedId === product.id && "bg-muted"
              )}
              onClick={() => onSelect(product)}
            >
              <TableCell className="hidden sm:table-cell">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={40}
                    height={40}
                    className="rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                    No img
                  </div>
                )}
              </TableCell>

              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{product.name}</span>
                  <Badge variant="outline" className="w-fit text-xs mt-1">
                    {product.categoryName}
                  </Badge>
                </div>
              </TableCell>

              <TableCell className="hidden md:table-cell">
                {formatCurrency(product.price)}
              </TableCell>

              <TableCell className="hidden lg:table-cell">
                {product.trueCost != null
                  ? formatCurrency(product.trueCost)
                  : "-"}
              </TableCell>

              <TableCell className="hidden lg:table-cell">
                {product.trueMarginPercent != null ? (
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      marginBelowTarget && "text-orange-600"
                    )}
                  >
                    {marginBelowTarget && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {product.trueMarginPercent.toFixed(0)}%
                  </span>
                ) : (
                  "-"
                )}
              </TableCell>

              <TableCell className="hidden md:table-cell">
                {product.recipeItemCount != null && product.recipeItemCount > 0 ? (
                  <Badge variant="secondary">{product.recipeItemCount} items</Badge>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </TableCell>

              <TableCell>
                <StockBadge
                  status={product.availability.status}
                  maxProducible={product.availability.maxProducible}
                  missingIngredients={product.availability.missingIngredients}
                  lowIngredients={product.availability.lowIngredients}
                  onViewAll={() => onSelect(product)}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
