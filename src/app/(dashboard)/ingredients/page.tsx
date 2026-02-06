"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
  DialogDescription,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Plus, Pencil, Trash2, RefreshCw, Package, ClipboardList, Info, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { formatDualUnitDisplay, formatCurrency } from "@/lib/ingredient-utils"
import { PURCHASE_UNITS, BASE_UNITS } from "@/types/ingredient"

interface Ingredient {
  id: number
  name: string
  category: string
  // New unit system
  baseUnit: string
  packageSize: number
  packageUnit: string
  costPerPackage: number
  costPerBaseUnit: number
  // Stock
  quantity: number
  totalBaseUnits: number
  parLevel: number
  stockStatus: "ok" | "low" | "critical" | "out"
  stockRatio: number | null
  countByBaseUnit: boolean
  // Metadata
  vendorId: number | null
  vendorName: string | null
  lastRestockDate: string | null
  lastUpdated: string
  barcode: string | null
  // Sellable
  sellable: boolean
  sellPrice: number | null
  linkedProductId: number | null
  syncStatus: string
  // Overhead
  isOverhead: boolean
  overheadPerTransaction: number | null
  // Cooking yield
  yieldFactor: number | null
  // Unit aliases
  unitAliases: Array<{
    id: number
    name: string
    baseUnitMultiplier: number
    description: string | null
    isDefault: boolean
  }>
  // Legacy (deprecated)
  unit: string
  costPerUnit: number
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
  "Supplies",
  "Other",
]

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
  const [restockCostPerPackage, setRestockCostPerPackage] = useState("")
  const [restocking, setRestocking] = useState(false)

  // Form state - new dual-unit system
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [vendorId, setVendorId] = useState<string>("")
  // Purchasing section
  const [packageUnit, setPackageUnit] = useState("pack")
  const [costPerPackage, setCostPerPackage] = useState("")
  // Usage section
  const [baseUnit, setBaseUnit] = useState("pcs")
  const [packageSize, setPackageSize] = useState("1")
  // Stock section
  const [quantity, setQuantity] = useState("0")
  const [parLevel, setParLevel] = useState("0")
  // Cooking yield
  const [yieldFactor, setYieldFactor] = useState<string>("")
  // Unit aliases
  const [unitAliases, setUnitAliases] = useState<Array<{
    id: number
    name: string
    baseUnitMultiplier: number
    description: string | null
    isDefault: boolean
  }>>([])
  const [newAliasName, setNewAliasName] = useState("")
  const [newAliasMultiplier, setNewAliasMultiplier] = useState("")
  const [addingAlias, setAddingAlias] = useState(false)

  // Calculated cost preview
  const calculatedCostPerBaseUnit = useMemo(() => {
    const cost = parseFloat(costPerPackage) || 0
    const size = parseFloat(packageSize) || 1
    if (size <= 0) return 0
    return cost / size
  }, [costPerPackage, packageSize])

  // Whether units are the same (hide conversion section)
  const showConversionSection = packageUnit !== baseUnit

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
    setVendorId(ingredient?.vendorId?.toString() || "")
    // New unit system
    setPackageUnit(ingredient?.packageUnit || "pack")
    setCostPerPackage(ingredient?.costPerPackage?.toString() || "")
    setBaseUnit(ingredient?.baseUnit || "pcs")
    setPackageSize(ingredient?.packageSize?.toString() || "1")
    setQuantity(ingredient?.quantity?.toString() || "0")
    setParLevel(ingredient?.parLevel?.toString() || "0")
    setYieldFactor(ingredient?.yieldFactor?.toString() || "")
    setUnitAliases(ingredient?.unitAliases || [])
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditIngredient(null)
    setName("")
    setCategory("")
    setVendorId("")
    setPackageUnit("pack")
    setCostPerPackage("")
    setBaseUnit("pcs")
    setPackageSize("1")
    setQuantity("0")
    setParLevel("0")
    setYieldFactor("")
    setUnitAliases([])
    setNewAliasName("")
    setNewAliasMultiplier("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedPackageSize = parseFloat(packageSize) || 0
    if (parsedPackageSize <= 0) {
      toast.error("Package size must be greater than 0")
      return
    }

    if (!name.trim() || !category || !packageUnit || !baseUnit) {
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
          vendorId: vendorId ? parseInt(vendorId) : null,
          // New unit system
          packageUnit,
          costPerPackage: parseFloat(costPerPackage) || 0,
          baseUnit,
          packageSize: parsedPackageSize,
          // Stock
          quantity: parseFloat(quantity) || 0,
          parLevel: parseInt(parLevel) || 0,
          // Cooking yield
          yieldFactor: yieldFactor ? parseFloat(yieldFactor) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }

      toast.success(editIngredient ? "Ingredient updated" : "Ingredient created")
      closeForm()
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save ingredient")
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
          costPerPackage: restockCostPerPackage ? parseFloat(restockCostPerPackage) : undefined,
          userId: 1, // TODO: Get from session
          userName: "Admin", // TODO: Get from session
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success(`Restocked ${restockQuantity} ${restockIngredient.packageUnit}(s) of ${restockIngredient.name}`)
      setRestockIngredient(null)
      setRestockQuantity("")
      setRestockCostPerPackage("")
      fetchData()
    } catch {
      toast.error("Failed to restock ingredient")
    } finally {
      setRestocking(false)
    }
  }

  async function handleAddAlias() {
    if (!editIngredient || !newAliasName.trim() || !newAliasMultiplier) return

    setAddingAlias(true)
    try {
      const res = await fetch(`/api/ingredients/${editIngredient.id}/unit-aliases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAliasName.trim().toLowerCase(),
          baseUnitMultiplier: parseFloat(newAliasMultiplier),
          description: `1 ${newAliasName.trim()} = ${newAliasMultiplier} ${baseUnit}`,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add unit")
      }

      const alias = await res.json()
      setUnitAliases(prev => [...prev, alias])
      setNewAliasName("")
      setNewAliasMultiplier("")
      toast.success(`Added "${alias.name}" unit`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add unit")
    } finally {
      setAddingAlias(false)
    }
  }

  async function handleRemoveAlias(aliasId: number) {
    if (!editIngredient) return

    try {
      const res = await fetch(`/api/ingredients/${editIngredient.id}/unit-aliases/${aliasId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")

      setUnitAliases(prev => prev.filter(a => a.id !== aliasId))
      toast.success("Unit removed")
    } catch {
      toast.error("Failed to remove unit")
    }
  }

  function handlePresetClick(name: string, multiplier: number) {
    setNewAliasName(name)
    setNewAliasMultiplier(multiplier.toString())
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Ingredients</h1>
          <p className="text-muted-foreground text-sm">Manage recipe ingredients and costs</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/ingredients/count">
              <ClipboardList className="h-4 w-4 mr-2" />
              Start Count
            </Link>
          </Button>
          <Button onClick={() => openForm()}>
            <Plus className="h-4 w-4 mr-2" /> Add Ingredient
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Category</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right hidden md:table-cell">Min. Stock</TableHead>
            <TableHead className="text-right hidden md:table-cell">Cost/Unit</TableHead>
            <TableHead className="hidden lg:table-cell">Vendor</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ingredients.map((ingredient) => (
            <TableRow key={ingredient.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {ingredient.name}
                  {ingredient.isOverhead && (
                    <Badge variant="outline" className="text-xs">Overhead</Badge>
                  )}
                  {ingredient.sellable && (
                    <Badge variant="outline" className="text-xs bg-green-50">Sellable</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline">{ingredient.category}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm">
                    {formatDualUnitDisplay(
                      ingredient.quantity,
                      ingredient.packageSize,
                      ingredient.packageUnit,
                      ingredient.baseUnit
                    )}
                  </span>
                  {ingredient.stockStatus === "critical" && (
                    <Badge variant="destructive" className="text-xs">Critical</Badge>
                  )}
                  {ingredient.stockStatus === "low" && (
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Low</Badge>
                  )}
                  {ingredient.stockStatus === "out" && (
                    <Badge variant="destructive" className="text-xs">Out</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right hidden md:table-cell">
                {ingredient.parLevel} {ingredient.packageUnit}
              </TableCell>
              <TableCell className="text-right hidden md:table-cell">
                <div className="flex flex-col items-end">
                  <span>{formatCurrency(ingredient.costPerBaseUnit)}/{ingredient.baseUnit}</span>
                  {ingredient.packageSize !== 1 && (
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(ingredient.costPerPackage)}/{ingredient.packageUnit}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground hidden lg:table-cell">
                {ingredient.vendorName || "—"}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setRestockIngredient(ingredient)
                      setRestockCostPerPackage(ingredient.costPerPackage.toString())
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
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No ingredients found. Add your first ingredient to start building recipes.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>

      {/* Add/Edit Dialog - New Dual-Unit Form */}
      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editIngredient ? "Edit Ingredient" : "Add Ingredient"}
            </DialogTitle>
            <DialogDescription>
              Define how you purchase and use this ingredient
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ingredient Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Burger Patties"
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
                  <Label>Vendor</Label>
                  <Select value={vendorId || "__none__"} onValueChange={(v) => setVendorId(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No vendor</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Purchasing Section */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium text-sm">Purchasing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>I buy this as *</Label>
                  <Select value={packageUnit} onValueChange={(v) => {
                    setPackageUnit(v)
                    // If same as baseUnit, set packageSize to 1
                    if (v === baseUnit) {
                      setPackageSize("1")
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PURCHASE_UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costPerPackage">Cost per {packageUnit} (₱) *</Label>
                  <Input
                    id="costPerPackage"
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPerPackage}
                    onChange={(e) => setCostPerPackage(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Usage/Conversion Section - only show if units differ */}
            {showConversionSection && (
              <div className="space-y-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <h3 className="font-medium text-sm">Usage (Conversion)</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Each {packageUnit} has</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={packageSize}
                      onChange={(e) => setPackageSize(e.target.value)}
                      placeholder="8"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unit for recipes *</Label>
                    <Select value={baseUnit} onValueChange={(v) => {
                      setBaseUnit(v)
                      // If same as packageUnit, set packageSize to 1
                      if (v === packageUnit) {
                        setPackageSize("1")
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BASE_UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Cost per {baseUnit}
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Label>
                    <div className="h-9 px-3 flex items-center bg-green-50 border border-green-200 rounded-md text-green-700 font-medium">
                      {formatCurrency(calculatedCostPerBaseUnit)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* When units are same, show simpler view */}
            {!showConversionSection && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>Purchase unit and recipe unit are the same ({packageUnit})</span>
                </div>
                <input type="hidden" value="1" />
              </div>
            )}

            {/* Cooking Yield Section */}
            <div className="space-y-3 p-4 bg-amber-50/50 rounded-lg border border-amber-100">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Cooking Yield (Optional)</Label>
<TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex">
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>
                        How much this ingredient expands or shrinks when cooked.
                        Rice typically yields 3x (expands), meat yields 0.8x (shrinks).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    placeholder="e.g., 3 for rice"
                    value={yieldFactor}
                    onChange={(e) => setYieldFactor(e.target.value)}
                  />
                </div>
                <span className="text-sm text-muted-foreground">× yield</span>
              </div>
              {yieldFactor && parseFloat(yieldFactor) > 0 && (
                <p className="text-sm text-muted-foreground">
                  1 {baseUnit || "unit"} raw → {parseFloat(yieldFactor)} {baseUnit || "unit"} cooked
                </p>
              )}
            </div>

            {/* Recipe Units Section - Only show when editing existing ingredient */}
            {editIngredient && (
              <div className="space-y-3 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Recipe Units</Label>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex">
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p>
                          Add units like "cup" or "serving" for easier recipe entry.
                          These appear in the unit dropdown when adding this ingredient to recipes.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Current Aliases */}
                {unitAliases.length > 0 && (
                  <div className="space-y-2">
                    {unitAliases.map((alias) => (
                      <div
                        key={alias.id}
                        className="flex items-center justify-between p-2 bg-white rounded border"
                      >
                        <div>
                          <span className="font-medium">{alias.name}</span>
                          <span className="text-muted-foreground text-sm ml-2">
                            = {alias.baseUnitMultiplier} {baseUnit}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveAlias(alias.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Presets */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Quick add:</span>
                  {[
                    { name: "cup", multiplier: baseUnit === "mL" ? 240 : 200 },
                    { name: "tbsp", multiplier: baseUnit === "mL" ? 15 : 15 },
                    { name: "tsp", multiplier: baseUnit === "mL" ? 5 : 5 },
                    { name: "serving", multiplier: 100 },
                  ].map((preset) => (
                    <Button
                      key={preset.name}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handlePresetClick(preset.name, preset.multiplier)}
                    >
                      + {preset.name}
                    </Button>
                  ))}
                </div>

                {/* Add Custom */}
                <div className="flex gap-2 pt-2 border-t">
                  <Input
                    placeholder="Unit name"
                    value={newAliasName}
                    onChange={(e) => setNewAliasName(e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">=</span>
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newAliasMultiplier}
                      onChange={(e) => setNewAliasMultiplier(e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">{baseUnit}</span>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddAlias}
                    disabled={addingAlias || !newAliasName || !newAliasMultiplier}
                    size="sm"
                  >
                    {addingAlias ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                  </Button>
                </div>
              </div>
            )}

            {/* Stock Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Current Stock ({packageUnit}s)</Label>
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

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="parLevel">Min. Stock ({packageUnit}s)</Label>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex">
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>
                          Alert threshold. When stock falls to this level,
                          a warning badge appears in the sidebar. Set to 0 to disable alerts.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="parLevel"
                  type="number"
                  min="0"
                  value={parLevel}
                  onChange={(e) => setParLevel(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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

      {/* Restock Dialog - Updated for dual-unit system */}
      <Dialog open={!!restockIngredient} onOpenChange={() => setRestockIngredient(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Restock {restockIngredient?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Current: {restockIngredient && formatDualUnitDisplay(
                restockIngredient.quantity,
                restockIngredient.packageSize,
                restockIngredient.packageUnit,
                restockIngredient.baseUnit
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="restockQty">{restockIngredient?.packageUnit}(s) to Add *</Label>
              <Input
                id="restockQty"
                type="number"
                step="0.01"
                min="0.01"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(e.target.value)}
                placeholder={`Enter number of ${restockIngredient?.packageUnit}s`}
                autoFocus
              />
              {restockIngredient && restockIngredient.packageSize !== 1 && restockQuantity && (
                <p className="text-xs text-muted-foreground">
                  = {(parseFloat(restockQuantity) * restockIngredient.packageSize).toFixed(1)} {restockIngredient.baseUnit}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="restockCost">New Cost per {restockIngredient?.packageUnit} (₱)</Label>
              <Input
                id="restockCost"
                type="number"
                step="0.01"
                min="0"
                value={restockCostPerPackage}
                onChange={(e) => setRestockCostPerPackage(e.target.value)}
                placeholder="Leave blank to keep current"
              />
              {restockIngredient && restockCostPerPackage && restockIngredient.packageSize > 1 && (
                <p className="text-xs text-muted-foreground">
                  = {formatCurrency(parseFloat(restockCostPerPackage) / restockIngredient.packageSize)} per {restockIngredient.baseUnit}
                </p>
              )}
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
