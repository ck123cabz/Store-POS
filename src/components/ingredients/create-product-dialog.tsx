"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Category {
  id: number
  name: string
}

interface CreateProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredientId: number
  ingredientName: string
  variantId: number
  variantLabel: string
  costPerVariant: number
  baseUnitsPerVariant: number
  onCreated?: (productId: number) => void
}

export function CreateProductDialog({
  open,
  onOpenChange,
  ingredientId,
  ingredientName,
  variantId,
  variantLabel,
  costPerVariant,
  baseUnitsPerVariant,
  onCreated,
}: CreateProductDialogProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Fetch categories
  useEffect(() => {
    if (!open) return
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data)
      })
      .catch(() => {})
  }, [open])

  // Pre-fill suggested price (2x cost markup)
  useEffect(() => {
    if (!open) return
    const unitCost = baseUnitsPerVariant > 0
      ? costPerVariant / baseUnitsPerVariant
      : 0
    const suggested = Math.ceil(unitCost * 2 * 100) / 100
    setSellPrice(suggested > 0 ? suggested.toString() : "")
    setCategoryId("")
  }, [open, costPerVariant, baseUnitsPerVariant])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!categoryId || !sellPrice) {
      toast.error("Please fill in all fields")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/ingredients/${ingredientId}/create-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          categoryId: parseInt(categoryId),
          sellPrice: parseFloat(sellPrice),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create product")
      }

      const created = await res.json()
      toast.success(`Product "${created.name}" created`)
      onCreated?.(created.id)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create product")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Product</DialogTitle>
          <DialogDescription>
            Create a POS product for &ldquo;{ingredientName} ({variantLabel})&rdquo; with a 1-ingredient recipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-sell-price">Sell Price *</Label>
            <Input
              id="cp-sell-price"
              type="number"
              step="0.01"
              min="0"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Cost per unit: ~{baseUnitsPerVariant > 0
                ? (costPerVariant / baseUnitsPerVariant).toFixed(2)
                : "N/A"}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Product"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
