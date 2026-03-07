"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, pluralizeUnit } from "@/lib/ingredient-utils"

interface PurchaseVariant {
  id: number
  label: string
  contentQty: number
  contentUnitName: string
  packageQty: number
  packageUnitName: string
  costPerVariant: number
  baseUnitsPerVariant: number
  isDefault: boolean
}

interface RestockIngredient {
  id: number
  name: string
  stockQty: number
  baseUnitName: string
  purchaseVariants: PurchaseVariant[]
}

interface RestockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredient: RestockIngredient | null
  onSuccess?: () => void
}

export function RestockDialog({
  open,
  onOpenChange,
  ingredient,
  onSuccess,
}: RestockDialogProps) {
  const { data: session } = useSession()
  const [selectedVariantId, setSelectedVariantId] = useState<string>("")
  const [quantity, setQuantity] = useState("")
  const [costPerVariant, setCostPerVariant] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const quantityInputRef = useRef<HTMLInputElement>(null)

  // Reset form when ingredient changes
  useEffect(() => {
    if (ingredient) {
      const defaultVariant =
        ingredient.purchaseVariants.find((v) => v.isDefault) ??
        ingredient.purchaseVariants[0]
      if (defaultVariant) {
        setSelectedVariantId(defaultVariant.id.toString())
        setCostPerVariant(defaultVariant.costPerVariant.toString())
      } else {
        setSelectedVariantId("")
        setCostPerVariant("")
      }
      setQuantity("")
      setNote("")
    }
  }, [ingredient])

  // Update cost when variant selection changes
  const selectedVariant = useMemo(() => {
    if (!ingredient || !selectedVariantId) return null
    return ingredient.purchaseVariants.find(
      (v) => v.id === parseInt(selectedVariantId)
    ) ?? null
  }, [ingredient, selectedVariantId])

  useEffect(() => {
    if (selectedVariant) {
      setCostPerVariant(selectedVariant.costPerVariant.toString())
    }
  }, [selectedVariant])

  // Auto-focus quantity input when dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        quantityInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  const parsedQuantity = parseFloat(quantity) || 0
  const parsedCost = parseFloat(costPerVariant) || 0

  // Conversion display: X x variant = Y base units
  const conversionDisplay = useMemo(() => {
    if (!ingredient || !selectedVariant || parsedQuantity <= 0) return null
    const totalBase = parsedQuantity * selectedVariant.baseUnitsPerVariant
    const formatted =
      totalBase % 1 === 0 ? totalBase.toString() : totalBase.toFixed(2)
    return `${parsedQuantity} x ${selectedVariant.label} = ${formatted} ${pluralizeUnit(ingredient.baseUnitName)} added to stock`
  }, [ingredient, selectedVariant, parsedQuantity])

  // Cost per base unit display
  const costPerBaseDisplay = useMemo(() => {
    if (!selectedVariant || parsedCost <= 0) return null
    if (selectedVariant.baseUnitsPerVariant <= 0) return null
    const costPerBase = parsedCost / selectedVariant.baseUnitsPerVariant
    return `${formatCurrency(costPerBase)} per ${ingredient?.baseUnitName}`
  }, [selectedVariant, parsedCost, ingredient])

  const isValid = parsedQuantity > 0 && !!selectedVariant

  async function handleSubmit() {
    if (!ingredient || !selectedVariant || !isValid) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/ingredients/${ingredient.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: selectedVariant.id,
          quantity: parsedQuantity,
          costPerVariant: costPerVariant ? parsedCost : undefined,
          userId: session?.user?.id ? parseInt(session.user.id) : 0,
          userName: session?.user?.name || "Unknown",
          note: note.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to restock")
      }

      const totalBase = parsedQuantity * selectedVariant.baseUnitsPerVariant
      const baseFormatted =
        totalBase % 1 === 0 ? totalBase.toString() : totalBase.toFixed(2)
      toast.success(
        `Restocked ${baseFormatted} ${pluralizeUnit(ingredient.baseUnitName)} of ${ingredient.name}`
      )
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to restock ingredient"
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!ingredient) return null

  const hasVariants = ingredient.purchaseVariants.length > 0
  const currentStockFormatted =
    ingredient.stockQty % 1 === 0
      ? ingredient.stockQty.toString()
      : ingredient.stockQty.toFixed(2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Restock {ingredient.name}</DialogTitle>
          <DialogDescription>
            Current stock:{" "}
            <span className="font-mono tabular-nums">
              {currentStockFormatted} {pluralizeUnit(ingredient.baseUnitName)}
            </span>
          </DialogDescription>
        </DialogHeader>

        {!hasVariants ? (
          <p className="text-sm text-muted-foreground py-4">
            No purchase variants configured for this ingredient. Add a purchase
            variant first.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Variant selector */}
            {ingredient.purchaseVariants.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="restock-variant" className="text-sm font-medium">
                  Purchase Variant
                </Label>
                <Select
                  value={selectedVariantId}
                  onValueChange={setSelectedVariantId}
                >
                  <SelectTrigger id="restock-variant" className="h-10">
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredient.purchaseVariants.map((v) => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.label}{" "}
                        <span className="text-muted-foreground">
                          ({v.baseUnitsPerVariant} {ingredient.baseUnitName})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Single variant display */}
            {ingredient.purchaseVariants.length === 1 && selectedVariant && (
              <div className="rounded-md border px-3 py-2 text-sm">
                <span className="font-medium">{selectedVariant.label}</span>
                <span className="text-muted-foreground ml-2">
                  ({selectedVariant.baseUnitsPerVariant}{" "}
                  {pluralizeUnit(ingredient.baseUnitName)} per unit)
                </span>
              </div>
            )}

            {/* Quantity input */}
            <div className="space-y-2">
              <Label
                htmlFor="restock-quantity"
                className="text-sm font-medium"
              >
                Quantity
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={quantityInputRef}
                  id="restock-quantity"
                  type="number"
                  step="1"
                  min="1"
                  className="h-10 font-mono tabular-nums"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                />
                {selectedVariant && (
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    x {selectedVariant.label}
                  </span>
                )}
              </div>
              {conversionDisplay && (
                <p className="text-xs text-muted-foreground font-mono tabular-nums">
                  {conversionDisplay}
                </p>
              )}
            </div>

            {/* Cost per variant input */}
            <div className="space-y-2">
              <Label htmlFor="restock-cost" className="text-sm font-medium">
                Cost per variant
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">&#8369;</span>
                <Input
                  id="restock-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10 font-mono tabular-nums"
                  value={costPerVariant}
                  onChange={(e) => setCostPerVariant(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {costPerBaseDisplay && (
                <p className="text-xs text-muted-foreground">
                  ={" "}
                  <span className="font-mono tabular-nums">
                    {costPerBaseDisplay}
                  </span>
                </p>
              )}
            </div>

            {/* Note input */}
            <div className="space-y-2">
              <Label htmlFor="restock-note" className="text-sm font-medium">
                Note
              </Label>
              <Input
                id="restock-note"
                type="text"
                className="h-10"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Delivery note, invoice #..."
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || submitting || !hasVariants}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Add Stock"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
