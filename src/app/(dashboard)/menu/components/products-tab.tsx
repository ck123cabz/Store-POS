"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { getImageSrc, isDataUrl } from "@/lib/image-utils"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { StatusDot } from "@/components/ui/status-dot"
import { formatCurrency } from "@/lib/ingredient-utils"
import { cn } from "@/lib/utils"
import { Search, UtensilsCrossed, Plus, AlertTriangle, SearchX } from "lucide-react"

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
  status?: string
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
  onAddProduct?: () => void
  targetMargin?: number
  externalCategoryFilter?: number | null
  onClearExternalFilter?: () => void
}

function getStockStatusDot(status: "available" | "low" | "critical" | "out") {
  switch (status) {
    case "available":
      return { variant: "ok" as const, label: "Available" }
    case "low":
      return { variant: "warning" as const, label: "Low" }
    case "critical":
      return { variant: "critical" as const, label: "Critical" }
    case "out":
      return { variant: "critical" as const, label: "Out" }
  }
}

function getMarginColor(marginPercent: number, targetMargin: number): string {
  if (marginPercent >= targetMargin) return "text-status-ok"
  if (marginPercent >= targetMargin * 0.75) return "text-status-warning"
  return "text-status-critical"
}

export function ProductsTab({
  products,
  categories,
  selectedProductId,
  onSelectProduct,
  onAddProduct,
  targetMargin = 65,
  externalCategoryFilter,
  onClearExternalFilter,
}: ProductsTabProps) {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [productStatusFilter, setProductStatusFilter] = useState<string>("ACTIVE")

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

  const hasFilters = search !== "" || effectiveCategoryFilter !== "all" || statusFilter !== "all" || productStatusFilter !== "ACTIVE"

  const clearFilters = () => {
    setSearch("")
    setCategoryFilter("all")
    setStatusFilter("all")
    setProductStatusFilter("ACTIVE")
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

      // Product lifecycle status filter
      if (productStatusFilter !== "all") {
        const pStatus = p.status ?? "ACTIVE"
        if (pStatus !== productStatusFilter) return false
      }

      return true
    })
  }, [products, search, effectiveCategoryFilter, statusFilter, productStatusFilter])

  const columns: DataTableColumn<Product>[] = [
    {
      id: "image",
      header: "",
      cell: (product) =>
        product.image ? (
          <Image
            src={getImageSrc(product.image)}
            alt={product.name}
            width={40}
            height={40}
            className="rounded object-cover size-10"
            unoptimized={isDataUrl(product.image)}
          />
        ) : (
          <div className="size-10 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
            No img
          </div>
        ),
      priority: 2,
      minWidth: "56px",
    },
    {
      id: "name",
      header: "Product",
      cell: (product) => (
        <div className="flex flex-col">
          <span className="font-medium">{product.name}</span>
          <Badge variant="outline" className="w-fit text-xs mt-1">
            {product.categoryName}
          </Badge>
        </div>
      ),
      priority: 0,
    },
    {
      id: "price",
      header: "Price",
      cell: (product) => (
        <span className="font-mono tabular-nums">
          {formatCurrency(product.price)}
        </span>
      ),
      priority: 1,
      align: "right",
    },
    {
      id: "cost",
      header: "Cost",
      cell: (product) => (
        <span className="font-mono tabular-nums">
          {product.trueCost != null ? formatCurrency(product.trueCost) : "\u2014"}
        </span>
      ),
      priority: 2,
      align: "right",
    },
    {
      id: "margin",
      header: "Margin",
      cell: (product) => {
        if (product.trueMarginPercent == null) {
          return <span className="text-muted-foreground">{"\u2014"}</span>
        }
        const marginBelowTarget = product.trueMarginPercent < targetMargin
        return (
          <span
            className={cn(
              "flex items-center gap-1 font-mono tabular-nums justify-end",
              getMarginColor(product.trueMarginPercent, targetMargin)
            )}
          >
            {marginBelowTarget && <AlertTriangle className="h-3 w-3" />}
            {product.trueMarginPercent.toFixed(0)}%
          </span>
        )
      },
      priority: 2,
      align: "right",
    },
    {
      id: "stock",
      header: "Stock",
      cell: (product) => {
        const dot = getStockStatusDot(product.availability.status)
        return <StatusDot variant={dot.variant} label={dot.label} />
      },
      priority: 0,
    },
    {
      id: "lifecycle",
      header: "Status",
      cell: (product) => {
        const status = product.status ?? "ACTIVE"
        if (status === "ACTIVE") return null
        const badgeConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
          DRAFT: { label: "Draft", variant: "secondary" },
          UNAVAILABLE: { label: "Unavailable", variant: "outline" },
          DISCONTINUED: { label: "Discontinued", variant: "destructive" },
        }
        const config = badgeConfig[status]
        if (!config) return null
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
      priority: 1,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search products"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={effectiveCategoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-40" aria-label="Filter by category">
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
          <SelectTrigger className="w-40" aria-label="Filter by status">
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

        <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
          <SelectTrigger className="w-44" aria-label="Filter by product status">
            <SelectValue placeholder="Product Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lifecycle</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
            <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredProducts}
        rowKey={(p) => p.id}
        pageSize={20}
        onRowClick={onSelectProduct}
        rowClassName={(p) =>
          p.id === selectedProductId ? "bg-muted" : undefined
        }
        emptyIcon={hasFilters ? <SearchX className="size-10" /> : <UtensilsCrossed className="size-10" />}
        emptyTitle={hasFilters ? "No products match your filters" : "Your menu is a blank canvas"}
        emptyDescription={hasFilters ? undefined : "Add your first product to get started."}
        emptyAction={
          hasFilters ? (
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : onAddProduct ? (
            <Button size="sm" onClick={onAddProduct}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          ) : undefined
        }
      />
    </div>
  )
}
