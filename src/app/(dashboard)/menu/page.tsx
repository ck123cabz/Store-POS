"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProductsTab } from "./components/products-tab"
import { ProductPanel } from "./components/product-panel"
import { CategoriesTab } from "./components/categories-tab"
import { ProductForm } from "@/components/products/product-form"
import { RecipeEditor } from "./components/recipe-editor"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  const [editMode, setEditMode] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editTab, setEditTab] = useState<"basic" | "recipe">("basic")

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

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditMode(false)
    setEditTab("basic")
  }

  const handleFormSuccess = () => {
    handleCloseForm()
    void fetchData()
  }

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setFormOpen(true)
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

            <Button onClick={activeTab === "products" ? handleAddProduct : undefined}>
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
      {selectedProduct && !editMode && (
        <div className="w-full md:w-96 lg:w-[450px] shrink-0">
          <ProductPanel
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onEdit={() => setEditMode(true)}
            targetMargin={settings.targetTrueMarginPercent}
          />
        </div>
      )}

      {/* Add New Product Dialog */}
      <ProductForm
        open={formOpen}
        onClose={handleCloseForm}
        onSuccess={handleFormSuccess}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
      />

      {/* Edit Product Dialog with Tabs */}
      <Dialog open={editMode} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Edit Product: {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>

          <Tabs
            value={editTab}
            onValueChange={(v) => setEditTab(v as "basic" | "recipe")}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="recipe">Recipe</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="basic" className="m-0">
                {selectedProduct && (
                  <ProductFormInline
                    product={{
                      id: selectedProduct.id,
                      name: selectedProduct.name,
                      price: selectedProduct.price,
                      image: selectedProduct.image,
                      categoryId: selectedProduct.categoryId,
                    }}
                    categories={categories.map(c => ({ id: c.id, name: c.name }))}
                    onSuccess={handleFormSuccess}
                    onCancel={handleCloseForm}
                  />
                )}
              </TabsContent>

              <TabsContent value="recipe" className="m-0">
                {selectedProduct && (
                  <RecipeEditor
                    productId={selectedProduct.id}
                    productName={selectedProduct.name}
                    productPrice={selectedProduct.price}
                    targetMargin={settings.targetTrueMarginPercent}
                    onSave={() => {
                      void fetchData()
                    }}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Inline ProductForm for the edit dialog (no dialog wrapper)
 */
function ProductFormInline({
  product,
  categories,
  onSuccess,
  onCancel,
}: {
  product: {
    id: number
    name: string
    price: number
    image: string
    categoryId: number
  }
  categories: { id: number; name: string }[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: product.name,
    price: product.price.toString(),
    categoryId: product.categoryId,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      let imageFilename = null

      if (imageFile) {
        const formDataUpload = new FormData()
        formDataUpload.append("file", imageFile)
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formDataUpload })
        if (!uploadRes.ok) throw new Error("Image upload failed")
        const { filename } = await uploadRes.json()
        imageFilename = filename
      }

      const body = {
        name: formData.name,
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        ...(imageFilename && { image: imageFilename }),
      }

      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error("Failed to save")

      onSuccess()
    } catch {
      console.error("Failed to save product")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <input
          id="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="price" className="text-sm font-medium">Price</label>
        <input
          id="price"
          type="number"
          step="0.01"
          required
          value={formData.price}
          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <select
          value={formData.categoryId}
          onChange={(e) => setFormData(prev => ({ ...prev, categoryId: parseInt(e.target.value) }))}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="image" className="text-sm font-medium">Product Image</label>
        <input
          id="image"
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  )
}
