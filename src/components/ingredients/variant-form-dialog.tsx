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
import type { PurchaseVariant } from "@/types/ingredient"

interface Unit {
  id: number
  name: string
  abbr: string
  dimension: "WEIGHT" | "VOLUME" | "COUNT"
  isDiscrete: boolean
}

interface Vendor {
  id: number
  name: string
}

interface VariantFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredientId: number
  ingredientName: string
  variant: PurchaseVariant | null
  units: Unit[]
  vendors: Vendor[]
  onSaved: (variant: PurchaseVariant) => void
}

export function VariantFormDialog({
  open,
  onOpenChange,
  ingredientId,
  ingredientName,
  variant,
  units,
  vendors,
  onSaved,
}: VariantFormDialogProps) {
  const isEdit = !!variant

  // Form state
  const [label, setLabel] = useState("")
  const [contentQty, setContentQty] = useState("1")
  const [contentUnitId, setContentUnitId] = useState("")
  const [packageQty, setPackageQty] = useState("1")
  const [packageUnitId, setPackageUnitId] = useState("")
  const [costPerVariant, setCostPerVariant] = useState("")
  const [vendorId, setVendorId] = useState("")
  const [barcode, setBarcode] = useState("")
  const [sku, setSku] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Populate form when variant changes
  useEffect(() => {
    if (!open) return
    if (variant) {
      setLabel(variant.label)
      setContentQty(variant.contentQty.toString())
      setContentUnitId(variant.contentUnitId.toString())
      setPackageQty(variant.packageQty.toString())
      setPackageUnitId(variant.packageUnitId.toString())
      setCostPerVariant(variant.costPerVariant.toString())
      setVendorId(variant.vendorId?.toString() || "")
      setBarcode(variant.barcode || "")
      setSku(variant.sku || "")
    } else {
      setLabel("")
      setContentQty("1")
      setContentUnitId("")
      setPackageQty("1")
      setPackageUnitId("")
      setCostPerVariant("")
      setVendorId("")
      setBarcode("")
      setSku("")
    }
  }, [open, variant])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!label.trim() || !contentUnitId || !packageUnitId || !costPerVariant) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const body = {
        label: label.trim(),
        contentQty: parseFloat(contentQty) || 1,
        contentUnitId: parseInt(contentUnitId),
        packageQty: parseInt(packageQty) || 1,
        packageUnitId: parseInt(packageUnitId),
        costPerVariant: parseFloat(costPerVariant) || 0,
        vendorId: vendorId ? parseInt(vendorId) : null,
        barcode: barcode.trim() || null,
        sku: sku.trim() || null,
      }

      const url = isEdit
        ? `/api/ingredients/${ingredientId}/variants/${variant.id}`
        : `/api/ingredients/${ingredientId}/variants`

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save variant")
      }

      const saved = await res.json()
      toast.success(isEdit ? "Variant updated" : "Variant created")
      onSaved(saved)
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save variant"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Variant" : "Add Purchase Variant"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update "${variant.label}" for ${ingredientName}`
              : `Add a new buyable format for ${ingredientName}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="var-label">Label *</Label>
            <Input
              id="var-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., 25kg Sack, 1kg Pack"
              required
            />
          </div>

          {/* Content: qty + unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="var-content-qty">Content Qty *</Label>
              <Input
                id="var-content-qty"
                type="number"
                step="0.01"
                min="0.01"
                value={contentQty}
                onChange={(e) => setContentQty(e.target.value)}
                placeholder="25"
              />
            </div>
            <div className="space-y-2">
              <Label>Content Unit *</Label>
              <Select value={contentUnitId} onValueChange={setContentUnitId}>
                <SelectTrigger aria-label="Content unit">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name} ({u.abbr})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Package: qty + unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="var-pkg-qty">Package Qty</Label>
              <Input
                id="var-pkg-qty"
                type="number"
                step="1"
                min="1"
                value={packageQty}
                onChange={(e) => setPackageQty(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Package Unit *</Label>
              <Select value={packageUnitId} onValueChange={setPackageUnitId}>
                <SelectTrigger aria-label="Package unit">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name} ({u.abbr})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label htmlFor="var-cost">Cost per Variant *</Label>
            <Input
              id="var-cost"
              type="number"
              step="0.01"
              min="0"
              value={costPerVariant}
              onChange={(e) => setCostPerVariant(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Vendor override */}
          <div className="space-y-2">
            <Label>Vendor (override)</Label>
            <Select
              value={vendorId || "__none__"}
              onValueChange={(v) => setVendorId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger aria-label="Vendor">
                <SelectValue placeholder="Same as ingredient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Same as ingredient</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id.toString()}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Barcode + SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="var-barcode">Barcode</Label>
              <Input
                id="var-barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="var-sku">SKU</Label>
              <Input
                id="var-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update"
              ) : (
                "Add Variant"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
