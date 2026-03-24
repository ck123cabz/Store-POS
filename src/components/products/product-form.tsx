"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Combobox } from "@/components/ui/combobox"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Folder, ChefHat } from "lucide-react"

interface Category {
  id: number
  name: string
}

interface ProductFormData {
  name: string
  price: string
  categoryId: number | null
  requiresKitchen: boolean
}

interface ProductFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  categories: Category[]
  product?: {
    id: number
    name: string
    price: number
    image: string
    categoryId: number
  } | null
}

export function ProductForm({ open, onClose, onSuccess, categories, product }: ProductFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const { register, handleSubmit, reset, setValue, watch } = useForm<ProductFormData>({
    defaultValues: {
      name: "",
      price: "",
      categoryId: null,
      requiresKitchen: false,
    },
  })

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        price: product.price.toString(),
        categoryId: product.categoryId,
      })
    } else {
      reset({
        name: "",
        price: "",
        categoryId: null,
        requiresKitchen: false,
      })
    }
    setImageFile(null)
  }, [product, reset])

  async function onSubmit(data: ProductFormData) {
    setSubmitting(true)
    try {
      let imageFilename = null

      // Upload image if selected
      if (imageFile) {
        const formData = new FormData()
        formData.append("file", imageFile)
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
        if (!uploadRes.ok) throw new Error("Image upload failed")
        const { filename } = await uploadRes.json()
        imageFilename = filename
      }

      const body = {
        name: data.name,
        price: parseFloat(data.price),
        categoryId: data.categoryId,
        requiresKitchen: data.requiresKitchen || null,
        ...(imageFilename && { image: imageFilename }),
      }

      const url = product ? `/api/products/${product.id}` : "/api/products"
      const method = product ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error("Failed to save")

      toast.success(product ? "Product updated" : "Product created")
      reset()
      setImageFile(null)
      onSuccess()
      onClose()
    } catch {
      toast.error("Failed to save product")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{product ? "Edit Product" : "Add Product"}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input id="price" type="number" step="0.01" {...register("price", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Combobox<number>
              options={categories.map((cat) => ({
                value: cat.id,
                label: cat.name,
              }))}
              value={watch("categoryId")}
              onChange={(v) => setValue("categoryId", v)}
              placeholder="Select category"
              searchPlaceholder="Search categories..."
              emptyMessage="No categories found."
              icon={<Folder className="size-4" />}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Product Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="requiresKitchen" className="text-sm font-medium">Send to Kitchen</Label>
                <p className="text-xs text-muted-foreground">
                  Create a kitchen order when sold
                </p>
              </div>
            </div>
            <Switch
              id="requiresKitchen"
              checked={watch("requiresKitchen")}
              onCheckedChange={(checked) => setValue("requiresKitchen", checked)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
