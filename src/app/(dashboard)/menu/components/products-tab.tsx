"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProductsTable } from "./products-table"
import { Search } from "lucide-react"

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

interface Category {
  id: number
  name: string
}

interface ProductsTabProps {
  products: Product[]
  categories: Category[]
  selectedProductId: number | null
  onSelectProduct: (product: Product) => void
  targetMargin?: number
  externalCategoryFilter?: number | null
  onClearExternalFilter?: () => void
}

export function ProductsTab({
  products,
  categories,
  selectedProductId,
  onSelectProduct,
  targetMargin = 65,
  externalCategoryFilter,
  onClearExternalFilter,
}: ProductsTabProps) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Apply external category filter when set
  const effectiveCategoryFilter = externalCategoryFilter !== null && externalCategoryFilter !== undefined
    ? String(externalCategoryFilter)
    : categoryFilter

  // Sync internal state with external filter for UI consistency
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    // Clear external filter when user manually changes category
    if (onClearExternalFilter && externalCategoryFilter !== null && externalCategoryFilter !== undefined) {
      onClearExternalFilter()
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search filter
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) {
        return false
      }

      // Category filter (use effective filter which includes external filter)
      if (effectiveCategoryFilter !== "all" && p.categoryId !== Number(effectiveCategoryFilter)) {
        return false
      }

      // Status filter
      if (statusFilter !== "all" && p.availability.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [products, search, effectiveCategoryFilter, statusFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={effectiveCategoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <ProductsTable
        products={filteredProducts}
        selectedId={selectedProductId}
        onSelect={onSelectProduct}
        targetMargin={targetMargin}
      />
    </div>
  )
}
