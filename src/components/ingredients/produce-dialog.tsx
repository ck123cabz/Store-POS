"use client"

import { useState, useEffect } from "react"
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
import { FlaskConical, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/ingredient-utils"
import type { Ingredient } from "@/types/ingredient"

interface ProductionRecipeResponse {
  ingredientId: number
  ingredientName: string
  baseUnitName: string
  batchYield: number
  inputs: Array<{
    id: number
    inputIngredientId: number
    inputIngredientName: string
    inputBaseUnitName: string
    inputBaseUnitAbbr: string
    quantity: number
    baseQuantity: number
    unitId: number | null
    unitName: string
    note: string | null
    costPerBaseUnit: number
    lineCost: number
  }>
  costs: {
    totalInputCost: number
    batchYield: number
    costPerUnit: number
  }
}

interface ProduceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredient: Ingredient
  onSuccess: () => void
}

export function ProduceDialog({
  open,
  onOpenChange,
  ingredient,
  onSuccess,
}: ProduceDialogProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [producing, setProducing] = useState(false)
  const [recipe, setRecipe] = useState<ProductionRecipeResponse | null>(null)
  const [batchCount, setBatchCount] = useState(1)
  const [note, setNote] = useState("")

  // Fetch production recipe when dialog opens
  useEffect(() => {
    if (!open) return

    setBatchCount(1)
    setNote("")
    setRecipe(null)

    async function fetchRecipe() {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/ingredients/${ingredient.id}/production-recipe`
        )
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to fetch recipe")
        }
        const data = await res.json()
        setRecipe(data)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load recipe"
        )
      } finally {
        setLoading(false)
      }
    }

    fetchRecipe()
  }, [open, ingredient.id])

  const canProduce = !producing && recipe && recipe.inputs.length > 0 && batchCount > 0

  async function handleProduce() {
    if (!recipe || !canProduce) return

    setProducing(true)
    try {
      const res = await fetch(`/api/ingredients/${ingredient.id}/produce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchCount,
          userId: session?.user?.id ? parseInt(session.user.id) : 1,
          userName: session?.user?.name || "Unknown",
          note: note.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        const errorMsg = data.details
          ? Array.isArray(data.details)
            ? data.details.join("\n")
            : data.error
          : data.error || "Production failed"
        throw new Error(errorMsg)
      }

      const data = await res.json()
      toast.success(data.message || `Produced ${batchCount} batch(es) of ${ingredient.name}`)
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to produce"
      )
    } finally {
      setProducing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Produce {ingredient.name}
          </DialogTitle>
          <DialogDescription>
            Create a batch of {ingredient.name} from raw ingredients
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recipe ? (
          <div className="space-y-4">
            {/* Batch count */}
            <div className="space-y-2">
              <Label htmlFor="batch-count">Number of Batches</Label>
              <Input
                id="batch-count"
                type="number"
                min="0.25"
                step="0.25"
                className="h-10 font-mono tabular-nums"
                value={batchCount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val) && val > 0) setBatchCount(val)
                  else if (e.target.value === "") setBatchCount(1)
                }}
              />
            </div>

            {/* Required inputs */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Required Inputs</Label>
              <div className="rounded-md border divide-y">
                {recipe.inputs.map((input) => {
                  const required = input.baseQuantity * batchCount
                  const requiredFormatted =
                    required % 1 === 0
                      ? required.toString()
                      : required.toFixed(2)

                  return (
                    <div
                      key={input.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span>{input.inputIngredientName}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono tabular-nums">
                          {requiredFormatted} {input.inputBaseUnitAbbr}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Expected output */}
            <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
              <span className="text-sm font-medium">Output</span>
              <span className="font-mono tabular-nums text-sm">
                +{recipe.batchYield * batchCount} {ingredient.baseUnitAbbr}
              </span>
            </div>

            {/* Cost info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Batch cost:{" "}
                <span className="font-mono tabular-nums">
                  {formatCurrency(recipe.costs.totalInputCost * batchCount)}
                </span>
              </span>
              <span>
                Cost per {ingredient.baseUnitName}:{" "}
                <span className="font-mono tabular-nums">
                  {formatCurrency(recipe.costs.costPerUnit)}
                </span>
              </span>
            </div>

            {/* Optional note */}
            <div className="space-y-2">
              <Label htmlFor="produce-note">Note (optional)</Label>
              <Input
                id="produce-note"
                className="h-10"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Morning prep batch"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            No production recipe defined.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleProduce} disabled={!canProduce}>
            {producing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Produce {batchCount % 1 === 0 ? batchCount : batchCount.toFixed(2)} Batch{batchCount !== 1 ? "es" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
