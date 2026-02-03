"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, ChefHat } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface Availability {
  status: "available" | "low" | "critical" | "out"
  maxProducible: number | null
  limitingIngredient: { id: number; name: string } | null
  warnings: string[]
}

interface Product {
  id: number
  name: string
  price: number
  image: string
  categoryId: number
  categoryName: string
  availability: Availability
}

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onRefresh: () => void
}

export function ProductTable({ products, onEdit, onRefresh }: ProductTableProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/products/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Product deleted")
      onRefresh()
    } catch {
      toast.error("Failed to delete product")
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 hidden sm:table-cell">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Stock</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="hidden sm:table-cell">
                  {product.image ? (
                    <Image
                      src={`/uploads/${product.image}`}
                      alt={product.name}
                      width={40}
                      height={40}
                      className="rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="hidden md:table-cell">{product.categoryName || "—"}</TableCell>
                <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                <TableCell className="text-right hidden sm:table-cell">
                  {product.availability.status === "available" && (
                    <span className="text-sm text-green-600 dark:text-green-500 font-medium">
                      In Stock
                    </span>
                  )}
                  {product.availability.status === "low" && (
                    <Badge
                      variant="outline"
                      className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 border-yellow-300 dark:border-yellow-500/30"
                    >
                      Can make {product.availability.maxProducible}
                    </Badge>
                  )}
                  {product.availability.status === "critical" && (
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge
                        variant="outline"
                        className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-500 border-orange-300 dark:border-orange-500/30"
                      >
                        Only {product.availability.maxProducible} left
                      </Badge>
                      {product.availability.limitingIngredient && (
                        <span className="text-[10px] text-muted-foreground">
                          Low on {product.availability.limitingIngredient.name}
                        </span>
                      )}
                    </div>
                  )}
                  {product.availability.status === "out" && (
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge variant="destructive">Out of Stock</Badge>
                      {product.availability.limitingIngredient && (
                        <span className="text-[10px] text-muted-foreground">
                          Missing: {product.availability.limitingIngredient.name}
                        </span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => window.location.href = `/recipes/${product.id}`}
                      title="Edit Recipe"
                    >
                      <ChefHat className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onEdit(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
