"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProductTable } from "@/components/products/product-table"
import { ProductForm } from "@/components/products/product-form"

interface Product {
  id: number
  name: string
  price: number
  quantity: number
  trackStock: boolean
  image: string
  categoryId: number
  categoryName: string
}

interface Category {
  id: number
  name: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  const fetchData = useCallback(async () => {
    const [productsRes, categoriesRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories"),
    ])
    setProducts(await productsRes.json())
    setCategories(await categoriesRes.json())
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleEdit(product: Product) {
    setEditProduct(product)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditProduct(null)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      <ProductTable products={products} onEdit={handleEdit} onRefresh={fetchData} />

      <ProductForm
        open={formOpen}
        onClose={handleClose}
        onSuccess={fetchData}
        categories={categories}
        product={editProduct}
      />
    </div>
  )
}
