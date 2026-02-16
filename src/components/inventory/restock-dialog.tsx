"use client"

import { useState, useEffect, useMemo, useRef } from "react"
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
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatDualUnitDisplay, formatCurrency } from "@/lib/ingredient-utils"

interface RestockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredient: {
    id: number
    name: string
    baseUnit: string
    packageUnit: string
    packageSize: number
    quantity: number
    totalBaseUnits: number
    costPerPackage: number
    costPerBaseUnit: number
    vendorId: number | null
    vendorName: string | null
    stockStatus: string
  } | null
  onSuccess?: () => void
}

export function RestockDialog({
  open,
  onOpenChange,
  ingredient,
  onSuccess,
}: RestockDialogProps) {
  const [quantity, setQuantity] = useState("")
  const [costPerPackage, setCostPerPackage] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const quantityInputRef = useRef<HTMLInputElement>(null)

  // Pre-fill cost when ingredient changes
  useEffect(() => {
    if (ingredient) {
      setCostPerPackage(ingredient.costPerPackage.toString())
      setQuantity("")
      setNote("")
    }
  }, [ingredient])

  // Auto-focus quantity input when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to let the dialog animate in
      const timer = setTimeout(() => {
        quantityInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  const parsedQuantity = parseFloat(quantity) || 0
  const parsedCost = parseFloat(costPerPackage) || 0

  // Conversion helper: show base unit equivalent when packageSize != 1
  const conversionDisplay = useMemo(() => {
    if (!ingredient || ingredient.packageSize === 1 || parsedQuantity <= 0) {
      return null
    }
    const totalBase = parsedQuantity * ingredient.packageSize
    const formatted = totalBase % 1 === 0 ? totalBase.toString() : totalBase.toFixed(1)
    return `= ${formatted} ${ingredient.baseUnit}`
  }, [ingredient, parsedQuantity])

  // Dynamic confirm button text
  const confirmText = useMemo(() => {
    if (!ingredient || parsedQuantity <= 0) return "Add"
    const unitLabel = parsedQuantity === 1 ? ingredient.packageUnit : pluralizeUnit(ingredient.packageUnit)
    if (parsedCost > 0) {
      return `Add ${parsedQuantity} ${unitLabel} at ${formatCurrency(parsedCost)}/${ingredient.packageUnit}`
    }
    return `Add ${parsedQuantity} ${unitLabel}`
  }, [ingredient, parsedQuantity, parsedCost])

  const isValid = parsedQuantity > 0

  async function handleSubmit() {
    if (!ingredient || !isValid) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/ingredients/${ingredient.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: parsedQuantity,
          costPerPackage: costPerPackage ? parsedCost : undefined,
          userId: 1, // TODO: Get from session
          userName: "Admin", // TODO: Get from session
          note: note.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to restock")
      }

      const unitLabel = parsedQuantity === 1 ? ingredient.packageUnit : pluralizeUnit(ingredient.packageUnit)
      toast.success(`Restocked ${parsedQuantity} ${unitLabel} of ${ingredient.name}`)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restock ingredient")
    } finally {
      setSubmitting(false)
    }
  }

  if (!ingredient) return null

  const currentStockDisplay = formatDualUnitDisplay(
    ingredient.quantity,
    ingredient.packageSize,
    ingredient.packageUnit,
    ingredient.baseUnit,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Restock {ingredient.name}</DialogTitle>
          <DialogDescription>
            Current: <span className="font-mono tabular-nums">{currentStockDisplay}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quantity input */}
          <div className="space-y-2">
            <Label htmlFor="restock-quantity" className="text-sm font-medium">
              Quantity
            </Label>
            <div className="flex items-center gap-2">
              <Input
                ref={quantityInputRef}
                id="restock-quantity"
                type="number"
                step="0.01"
                min="0.01"
                className="h-10 font-mono tabular-nums"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {ingredient.packageUnit}
              </span>
            </div>
            {conversionDisplay && (
              <p className="text-xs text-muted-foreground font-mono tabular-nums">
                {conversionDisplay}
              </p>
            )}
          </div>

          {/* Cost per package input */}
          <div className="space-y-2">
            <Label htmlFor="restock-cost" className="text-sm font-medium">
              Cost per {ingredient.packageUnit}
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">&#8369;</span>
              <Input
                id="restock-cost"
                type="number"
                step="0.01"
                min="0"
                className="h-10 font-mono tabular-nums"
                value={costPerPackage}
                onChange={(e) => setCostPerPackage(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {parsedCost > 0 && ingredient.packageSize > 1 && (
              <p className="text-xs text-muted-foreground">
                = <span className="font-mono tabular-nums">{formatCurrency(parsedCost / ingredient.packageSize)}</span> per {ingredient.baseUnit}
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

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Simple pluralization for common units */
function pluralizeUnit(unit: string): string {
  const invariant = ["kg", "g", "L", "mL", "pcs", "each"]
  if (invariant.includes(unit)) return unit
  if (unit.endsWith("s") || unit.endsWith("x")) return unit
  return `${unit}s`
}
