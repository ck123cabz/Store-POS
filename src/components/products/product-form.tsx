"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Info } from "lucide-react"
import Link from "next/link"

interface Category {
  id: number
  name: string
}

interface ProductFormData {
  name: string
  price: string
  categoryId: number | null
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
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
            <Select
              value={watch("categoryId")?.toString() || ""}
              onValueChange={(v) => setValue("categoryId", parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stock information message */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md border">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Stock is automatically calculated from ingredient availability.
              Manage stock through the <Link href="/ingredients" className="text-primary underline hover:no-underline">Ingredients</Link> page,
              or set up a recipe using the chef hat icon in the products table.
            </p>
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
