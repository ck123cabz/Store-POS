"use client"

import { useState, useEffect, useCallback } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, RefreshCw, Package } from "lucide-react"
import { toast } from "sonner"

interface Ingredient {
  id: number
  name: string
  category: string
  unit: string
  costPerUnit: number
  parLevel: number
  quantity: number
  stockStatus: "ok" | "low" | "critical" | "out"
  stockRatio: number | null
  vendorId: number | null
  vendorName: string | null
  lastRestockDate: string | null
  lastUpdated: string
  barcode: string | null
}

interface Vendor {
  id: number
  name: string
}

const INGREDIENT_CATEGORIES = [
  "Protein",
  "Produce",
  "Dairy",
  "Dry Goods",
  "Beverages",
  "Condiments",
  "Spices",
  "Packaging",
  "Other",
]

const UNITS = ["kg", "g", "L", "mL", "pcs", "pack", "bottle", "can", "box"]

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editIngredient, setEditIngredient] = useState<Ingredient | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Restock state
  const [restockIngredient, setRestockIngredient] = useState<Ingredient | null>(null)
  const [restockQuantity, setRestockQuantity] = useState("")
  const [restockCost, setRestockCost] = useState("")
  const [restocking, setRestocking] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [unit, setUnit] = useState("")
  const [costPerUnit, setCostPerUnit] = useState("")
  const [parLevel, setParLevel] = useState("")
  const [quantity, setQuantity] = useState("")
  const [vendorId, setVendorId] = useState<string>("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ingredientsRes, vendorsRes] = await Promise.all([
        fetch("/api/ingredients"),
        fetch("/api/vendors"),
      ])
      setIngredients(await ingredientsRes.json())
      setVendors(await vendorsRes.json())
    } catch (error) {
      console.error("Failed to fetch data", error)
      toast.error("Failed to load ingredients")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function openForm(ingredient?: Ingredient) {
    setEditIngredient(ingredient || null)
    setName(ingredient?.name || "")
    setCategory(ingredient?.category || "")
    setUnit(ingredient?.unit || "")
    setCostPerUnit(ingredient?.costPerUnit?.toString() || "")
    setParLevel(ingredient?.parLevel?.toString() || "0")
    setQuantity(ingredient?.quantity?.toString() || "0")
    setVendorId(ingredient?.vendorId?.toString() || "")
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditIngredient(null)
    setName("")
    setCategory("")
    setUnit("")
    setCostPerUnit("")
    setParLevel("0")
    setQuantity("0")
    setVendorId("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !category || !unit || !costPerUnit) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const url = editIngredient
        ? `/api/ingredients/${editIngredient.id}`
        : "/api/ingredients"
      const method = editIngredient ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          unit,
          costPerUnit: parseFloat(costPerUnit),
          parLevel: parseInt(parLevel) || 0,
          quantity: parseFloat(quantity) || 0,
          vendorId: vendorId ? parseInt(vendorId) : null,
        }),
      })

      if (!res.ok) throw new Error("Failed")

      toast.success(editIngredient ? "Ingredient updated" : "Ingredient created")
      closeForm()
      fetchData()
    } catch {
      toast.error("Failed to save ingredient")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/ingredients/${deleteId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete ingredient")
      }
      toast.success("Ingredient deleted")
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete ingredient")
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  async function handleRestock() {
    if (!restockIngredient || !restockQuantity) return
    setRestocking(true)
    try {
      const res = await fetch(`/api/ingredients/${restockIngredient.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: parseFloat(restockQuantity),
          costPerUnit: restockCost ? parseFloat(restockCost) : undefined,
          userId: 1, // TODO: Get from session
          userName: "Admin", // TODO: Get from session
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success(`Restocked ${restockQuantity} ${restockIngredient.unit} of ${restockIngredient.name}`)
      setRestockIngredient(null)
      setRestockQuantity("")
      setRestockCost("")
      fetchData()
    } catch {
      toast.error("Failed to restock ingredient")
    } finally {
      setRestocking(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Ingredients</h1>
          <p className="text-muted-foreground">Manage recipe ingredients and costs</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4 mr-2" /> Add Ingredient
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">PAR Level</TableHead>
            <TableHead className="text-right">Cost/Unit</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ingredients.map((ingredient) => (
            <TableRow key={ingredient.id}>
              <TableCell className="font-medium">{ingredient.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{ingredient.category}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span>{ingredient.quantity} {ingredient.unit}</span>
                  {ingredient.stockStatus === "critical" && (
                    <Badge variant="destructive">Critical</Badge>
                  )}
                  {ingredient.stockStatus === "low" && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Low</Badge>
                  )}
                  {ingredient.stockStatus === "out" && (
                    <Badge variant="destructive">Out</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">{ingredient.parLevel}</TableCell>
              <TableCell className="text-right">
                ₱{ingredient.costPerUnit.toFixed(2)}
              </TableCell>
              <TableCell>{ingredient.unit}</TableCell>
              <TableCell className="text-muted-foreground">
                {ingredient.vendorName || "—"}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setRestockIngredient(ingredient)
                      setRestockCost(ingredient.costPerUnit.toString())
                    }}
                    title="Restock"
                  >
                    <Package className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openForm(ingredient)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteId(ingredient.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {ingredients.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No ingredients found. Add your first ingredient to start building recipes.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editIngredient ? "Edit Ingredient" : "Add Ingredient"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Chicken Breast"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {INGREDIENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costPerUnit">Cost per Unit (₱) *</Label>
                <Input
                  id="costPerUnit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Current Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parLevel">PAR Level</Label>
              <Input
                id="parLevel"
                type="number"
                min="0"
                value={parLevel}
                onChange={(e) => setParLevel(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No vendor</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ingredient?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the ingredient from all recipes that use it.
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

      {/* Restock Dialog */}
      <Dialog open={!!restockIngredient} onOpenChange={() => setRestockIngredient(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Restock {restockIngredient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Current: {restockIngredient?.quantity} {restockIngredient?.unit}
            </div>
            <div className="space-y-2">
              <Label htmlFor="restockQty">Quantity to Add *</Label>
              <Input
                id="restockQty"
                type="number"
                step="0.01"
                min="0.01"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(e.target.value)}
                placeholder={`Enter ${restockIngredient?.unit}`}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restockCost">New Cost per Unit (₱)</Label>
              <Input
                id="restockCost"
                type="number"
                step="0.01"
                min="0"
                value={restockCost}
                onChange={(e) => setRestockCost(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRestockIngredient(null)}>
                Cancel
              </Button>
              <Button onClick={handleRestock} disabled={restocking || !restockQuantity}>
                {restocking ? "Restocking..." : "Restock"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
