"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus } from "lucide-react"
import { ProductsTab } from "./components/products-tab"
import { ProductPanel } from "./components/product-panel"
import { CategoriesTab } from "./components/categories-tab"
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
  const [activeTab, setActiveTab] = useState("products")
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<Settings>({ targetTrueMarginPercent: 65, currency: "PHP" })
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

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

      // Add recipe item count from API
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

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setEditMode(false) // Reset edit mode when selecting a new product
  }

  const handleReorderCategories = async (orders: { id: number; displayOrder: number }[]) => {
    try {
      const res = await fetch("/api/categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
      })

      if (!res.ok) {
        console.error("Failed to reorder categories")
        return
      }

      // Refetch categories to get updated order
      await fetchData()
    } catch (error) {
      console.error("Failed to reorder categories:", error)
    }
  }

  const handleEditCategory = (_category: Category) => {
    // Placeholder - will be implemented in Phase 5
  }

  const handleDeleteCategory = (_category: Category) => {
    // Placeholder - will be implemented in Phase 5
  }

  const handleToggleKitchen = async (categoryId: number, requiresKitchen: boolean) => {
    try {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiresKitchen }),
      })
      if (!res.ok) {
        toast.error("Failed to update kitchen setting")
        return
      }
      // Optimistic update
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, requiresKitchen } : c))
      )
      toast.success(requiresKitchen ? "Orders will be sent to kitchen" : "Kitchen orders disabled")
    } catch {
      toast.error("Failed to update kitchen setting")
    }
  }

  const handleFilterByCategory = (categoryId: number) => {
    setCategoryFilter(categoryId)
    setActiveTab("products")
  }

  const handleClearCategoryFilter = () => {
    setCategoryFilter(null)
  }

  const handleCloseForm = () => {
    setFormOpen(false)
  }

  const handleFormSuccess = () => {
    handleCloseForm()
    void fetchData()
  }

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setFormOpen(true)
  }

  const handleClosePanel = () => {
    setSelectedProduct(null)
    setEditMode(false)
  }

  const handleEnterEditMode = () => {
    setEditMode(true)
  }

  const handleCancelEdit = () => {
    setEditMode(false)
  }

  const handleSaveSuccess = () => {
    setEditMode(false)
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

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Menu</h1>
            <p className="text-muted-foreground mt-1">Manage products and categories</p>
          </div>

          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>

            <Button onClick={activeTab === "products" ? handleAddProduct : undefined}>
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === "products" ? "Add Product" : "Add Category"}
            </Button>
          </div>
        </div>

        <TabsContent value="products" className="mt-4">
          {loading ? (
            <div className="space-y-4">
              {/* Filter pills skeleton */}
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-full" />
                ))}
              </div>
              {/* Product cards skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-3">
                    <Skeleton className="h-32 w-full rounded-md" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ProductsTab
              products={products}
              categories={categories}
              selectedProductId={selectedProduct?.id ?? null}
              onSelectProduct={handleSelectProduct}
              onAddProduct={handleAddProduct}
              targetMargin={settings.targetTrueMarginPercent}
              externalCategoryFilter={categoryFilter}
              onClearExternalFilter={handleClearCategoryFilter}
            />
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-40" />
                  <div className="flex-1" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : (
            <CategoriesTab
              categories={categories}
              onReorder={handleReorderCategories}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              onFilterByCategory={handleFilterByCategory}
              onToggleKitchen={handleToggleKitchen}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Panel overlay (Sheet from right) */}
      <DetailPanel
        open={!!selectedProduct}
        onOpenChange={(open) => { if (!open) handleClosePanel() }}
      >
        {selectedProduct && (
          <ProductPanel
            product={selectedProduct}
            onClose={handleClosePanel}
            onEdit={handleEnterEditMode}
            onCancelEdit={handleCancelEdit}
            onSaveSuccess={handleSaveSuccess}
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
        onClose={handleCloseForm}
        onSuccess={handleFormSuccess}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
      />
    </div>
  )
}
