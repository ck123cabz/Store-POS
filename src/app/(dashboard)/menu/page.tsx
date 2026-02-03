"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProductsTab } from "./components/products-tab"
import { ProductPanel } from "./components/product-panel"
import { CategoriesTab } from "./components/categories-tab"
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
  const [settings, setSettings] = useState<Settings>({ targetTrueMarginPercent: 65, currency: "₱" })
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)
  // Edit mode will be implemented in Phase 5
  const [, setEditMode] = useState(false)

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
        currency: settingsData.currency ?? "₱",
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
    // Panel will be implemented in Phase 4
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

  const handleEditCategory = (category: Category) => {
    // Placeholder - will be implemented in Phase 5
    console.log("Edit category:", category)
  }

  const handleDeleteCategory = (category: Category) => {
    // Placeholder - will be implemented in Phase 5
    console.log("Delete category:", category)
  }

  const handleFilterByCategory = (categoryId: number) => {
    setCategoryFilter(categoryId)
    setActiveTab("products")
  }

  const handleClearCategoryFilter = () => {
    setCategoryFilter(null)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className={cn(
        "flex-1 overflow-auto p-4 md:p-6",
        selectedProduct && "hidden md:block md:pr-0"
      )}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>

            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === "products" ? "Add Product" : "Add Category"}
            </Button>
          </div>

          <TabsContent value="products" className="mt-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : (
              <ProductsTab
                products={products}
                categories={categories}
                selectedProductId={selectedProduct?.id ?? null}
                onSelectProduct={handleSelectProduct}
                targetMargin={settings.targetTrueMarginPercent}
                externalCategoryFilter={categoryFilter}
                onClearExternalFilter={handleClearCategoryFilter}
              />
            )}
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : (
              <CategoriesTab
                categories={categories}
                onReorder={handleReorderCategories}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
                onFilterByCategory={handleFilterByCategory}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Slide-out Panel */}
      {selectedProduct && (
        <div className="w-full md:w-96 lg:w-[450px] shrink-0">
          <ProductPanel
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onEdit={() => setEditMode(true)}
            targetMargin={settings.targetTrueMarginPercent}
          />
        </div>
      )}
    </div>
  )
}
