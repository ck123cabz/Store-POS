"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { LayoutGrid, List, Plus, ArrowUpDown } from "lucide-react"
import { MenuSidebar } from "./components/menu-sidebar"
import { ProductCards } from "./components/product-cards"
import { ProductsTab } from "./components/products-tab"
import { ProductPanel } from "./components/product-panel"
import { ProductForm } from "@/components/products/product-form"
import { DetailPanel } from "@/components/ui/detail-panel"

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

interface StockHealth {
  available: number
  low: number
  critical: number
  out: number
}

interface CategoryProduct {
  id: number
  name: string
  price: number
  availability: {
    status: "available" | "low" | "critical" | "out"
  }
}

interface Category {
  id: number
  name: string
  displayOrder: number
  requiresKitchen: boolean
  productCount: number
  stockHealth: StockHealth
  products?: CategoryProduct[]
}

interface Settings {
  targetTrueMarginPercent: number
  currency: string
}

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<Settings>({ targetTrueMarginPercent: 65, currency: "PHP" })
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  // Sidebar + view state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [productStatusFilter, setProductStatusFilter] = useState<string>("ACTIVE")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [productsRes, categoriesRes, settingsRes] = await Promise.all([
        fetch("/api/products?includeCosting=true"),
        fetch("/api/categories"),
        fetch("/api/settings"),
      ])

      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()
      const settingsData = await settingsRes.json()

      const productsWithCounts = productsData.map((p: Product & { recipeItems?: unknown[] }) => ({
        ...p,
        recipeItemCount: Array.isArray(p.recipeItems) ? p.recipeItems.length : 0,
      }))

      setProducts(productsWithCounts)
      setCategories(categoriesData)
      setSettings({
        targetTrueMarginPercent: settingsData.targetTrueMarginPercent ?? 65,
        currency: settingsData.currency ?? "PHP",
      })
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (selectedCategoryId !== null && p.categoryId !== selectedCategoryId) return false
      if (statusFilter !== "all" && p.availability.status !== statusFilter) return false
      if (productStatusFilter !== "all") {
        const pStatus = p.status ?? "ACTIVE"
        if (pStatus !== productStatusFilter) return false
      }
      return true
    })
  }, [products, search, selectedCategoryId, statusFilter, productStatusFilter])

  const hasFilters = search !== "" || selectedCategoryId !== null || statusFilter !== "all" || productStatusFilter !== "ACTIVE"

  const clearFilters = () => {
    setSearch("")
    setSelectedCategoryId(null)
    setStatusFilter("all")
    setProductStatusFilter("ACTIVE")
  }

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setEditMode(false)
  }

  const handleClosePanel = () => {
    setSelectedProduct(null)
    setEditMode(false)
  }

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setFormOpen(true)
  }

  const handleFormSuccess = () => {
    setFormOpen(false)
    void fetchData()
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedProduct) return
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to update status")
        return
      }
      toast.success(`${selectedProduct.name} is now ${newStatus.toLowerCase()}`)
      setSelectedProduct(null)
      void fetchData()
    } catch {
      toast.error("Failed to update product status")
    }
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to delete product")
        return
      }
      toast.success(`${selectedProduct.name} deleted`)
      setSelectedProduct(null)
      void fetchData()
    } catch {
      toast.error("Failed to delete product")
    }
  }

  const selectedCategoryName = selectedCategoryId !== null
    ? categories.find(c => c.id === selectedCategoryId)?.name ?? "Products"
    : "All Products"

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      {loading ? (
        <aside className="flex flex-col w-64 shrink-0 border-r bg-muted/30 p-5 gap-5">
          <div className="space-y-1">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-3 w-24" />
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </aside>
      ) : (
        <MenuSidebar
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          totalProducts={products.filter(p => (p.status ?? "ACTIVE") === (productStatusFilter === "all" ? (p.status ?? "ACTIVE") : productStatusFilter)).length}
          search={search}
          onSearchChange={setSearch}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b px-6 h-14 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">{selectedCategoryName}</h2>
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {filteredProducts.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => { if (v) setViewMode(v as "cards" | "table") }}
              size="sm"
              className="bg-muted rounded-md p-0.5"
            >
              <ToggleGroupItem value="cards" aria-label="Card view" className="h-7 w-7 p-0 data-[state=on]:bg-background">
                <LayoutGrid className="size-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table view" className="h-7 w-7 p-0 data-[state=on]:bg-background">
                <List className="size-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Stock status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs" aria-label="Filter by stock status">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            {/* Lifecycle filter */}
            <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs" aria-label="Filter by lifecycle">
                <SelectValue placeholder="Lifecycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lifecycle</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
              </SelectContent>
            </Select>

            {/* Add Product */}
            <Button size="sm" className="h-8" onClick={handleAddProduct}>
              <Plus className="size-3.5 mr-1.5" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border overflow-hidden">
                  <Skeleton className="h-32 w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === "cards" ? (
            <ProductCards
              products={filteredProducts}
              selectedProductId={selectedProduct?.id ?? null}
              onSelectProduct={handleSelectProduct}
              onAddProduct={handleAddProduct}
              targetMargin={settings.targetTrueMarginPercent}
              hasFilters={hasFilters}
              onClearFilters={clearFilters}
            />
          ) : (
            <ProductsTab
              products={filteredProducts}
              categories={categories}
              selectedProductId={selectedProduct?.id ?? null}
              onSelectProduct={handleSelectProduct}
              onAddProduct={handleAddProduct}
              targetMargin={settings.targetTrueMarginPercent}
              hideFilters
            />
          )}
        </div>
      </main>

      {/* Detail Panel overlay */}
      <DetailPanel
        open={!!selectedProduct}
        onOpenChange={(open) => { if (!open) handleClosePanel() }}
      >
        {selectedProduct && (
          <ProductPanel
            product={selectedProduct}
            onClose={handleClosePanel}
            onEdit={() => setEditMode(true)}
            onCancelEdit={() => setEditMode(false)}
            onSaveSuccess={() => { setEditMode(false); void fetchData() }}
            editMode={editMode}
            categories={categories.map(c => ({ id: c.id, name: c.name }))}
            targetMargin={settings.targetTrueMarginPercent}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteProduct}
          />
        )}
      </DetailPanel>

      {/* Add New Product Dialog */}
      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleFormSuccess}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
      />
    </div>
  )
}
