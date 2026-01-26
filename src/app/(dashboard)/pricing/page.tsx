"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RefreshCw, Save, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface Product {
  id: number
  name: string
  price: number
  trueCost: number | null
  trueMargin: number | null
  trueMarginPercent: number | null
  categoryName: string
}

interface PricingRow extends Product {
  selected: boolean
  newPrice: string
  newMarginPercent: number | null
}

export default function PricingCalculatorPage() {
  const [products, setProducts] = useState<PricingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [targetMargin, setTargetMargin] = useState<number>(65)
  const [currencySymbol, setCurrencySymbol] = useState<string>("$")

  // Bulk pricing controls
  const [bulkMarkupPercent, setBulkMarkupPercent] = useState<string>("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [productsRes, settingsRes] = await Promise.all([
        fetch("/api/products?includeCosting=true"),
        fetch("/api/settings"),
      ])

      const productsData = await productsRes.json()
      const settingsData = await settingsRes.json()

      setProducts(
        productsData.map((p: Product) => ({
          ...p,
          selected: false,
          newPrice: p.price.toFixed(2),
          newMarginPercent: p.trueMarginPercent,
        }))
      )
      setTargetMargin(settingsData.targetTrueMarginPercent || 65)
      setCurrencySymbol(settingsData.currencySymbol || "$")
    } catch {
      toast.error("Failed to load products")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function toggleSelect(id: number) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    )
  }

  function selectAll() {
    const allSelected = products.every((p) => p.selected)
    setProducts((prev) => prev.map((p) => ({ ...p, selected: !allSelected })))
  }

  function updatePrice(id: number, newPrice: string) {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const price = parseFloat(newPrice) || 0
        const margin = p.trueCost ? price - p.trueCost : null
        const marginPercent = price > 0 && margin !== null ? (margin / price) * 100 : null
        return {
          ...p,
          newPrice,
          newMarginPercent: marginPercent ? Math.round(marginPercent * 10) / 10 : null,
        }
      })
    )
  }

  function calculateFromMarkup(id: number, markupPercent: number) {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id || !p.trueCost) return p
        const newPrice = p.trueCost * (1 + markupPercent / 100)
        const margin = newPrice - p.trueCost
        const marginPercent = newPrice > 0 ? (margin / newPrice) * 100 : 0
        return {
          ...p,
          newPrice: newPrice.toFixed(2),
          newMarginPercent: Math.round(marginPercent * 10) / 10,
        }
      })
    )
  }

  function applyBulkMarkup() {
    const markup = parseFloat(bulkMarkupPercent)
    if (isNaN(markup)) {
      toast.error("Enter a valid markup percentage")
      return
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (!p.selected || !p.trueCost) return p
        const newPrice = p.trueCost * (1 + markup / 100)
        const margin = newPrice - p.trueCost
        const marginPercent = newPrice > 0 ? (margin / newPrice) * 100 : 0
        return {
          ...p,
          newPrice: newPrice.toFixed(2),
          newMarginPercent: Math.round(marginPercent * 10) / 10,
        }
      })
    )
    toast.success(`Applied ${markup}% markup to selected products`)
  }

  function setToTargetMargin() {
    // Target margin = (price - cost) / price
    // Solving for price: price = cost / (1 - targetMargin/100)
    setProducts((prev) =>
      prev.map((p) => {
        if (!p.selected || !p.trueCost) return p
        const newPrice = p.trueCost / (1 - targetMargin / 100)
        return {
          ...p,
          newPrice: newPrice.toFixed(2),
          newMarginPercent: targetMargin,
        }
      })
    )
    toast.success(`Set selected products to ${targetMargin}% margin`)
  }

  async function saveChanges() {
    const changed = products.filter(
      (p) => parseFloat(p.newPrice) !== p.price
    )

    if (changed.length === 0) {
      toast.info("No price changes to save")
      return
    }

    setSaving(true)
    try {
      await Promise.all(
        changed.map((p) =>
          fetch(`/api/products/${p.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ price: parseFloat(p.newPrice) }),
          })
        )
      )
      toast.success(`Updated prices for ${changed.length} products`)
      fetchData()
    } catch {
      toast.error("Failed to save some prices")
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = products.filter((p) => p.selected).length
  const changedCount = products.filter(
    (p) => parseFloat(p.newPrice) !== p.price
  ).length

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pricing Calculator</h1>
          <p className="text-muted-foreground">
            Calculate prices based on cost + markup
          </p>
        </div>
        <Button onClick={saveChanges} disabled={saving || changedCount === 0}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : `Save Changes (${changedCount})`}
        </Button>
      </div>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Pricing</CardTitle>
          <CardDescription>
            Apply pricing changes to multiple products at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Markup %</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={bulkMarkupPercent}
                  onChange={(e) => setBulkMarkupPercent(e.target.value)}
                  placeholder="e.g., 200"
                  className="w-24"
                />
                <Button
                  variant="secondary"
                  onClick={applyBulkMarkup}
                  disabled={selectedCount === 0}
                >
                  Apply Markup
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={setToTargetMargin}
              disabled={selectedCount === 0}
            >
              Set to Target ({targetMargin}%)
            </Button>
            <div className="text-sm text-muted-foreground">
              {selectedCount} product(s) selected
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={products.length > 0 && products.every((p) => p.selected)}
                    onCheckedChange={selectAll}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">True Cost</TableHead>
                <TableHead className="text-right">Current Price</TableHead>
                <TableHead className="text-right w-32">New Price</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="w-24">Quick Set</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const priceChanged = parseFloat(product.newPrice) !== product.price
                const belowTarget =
                  product.newMarginPercent !== null &&
                  product.newMarginPercent < targetMargin

                return (
                  <TableRow key={product.id} className={priceChanged ? "bg-blue-50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={product.selected}
                        onCheckedChange={() => toggleSelect(product.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.categoryName || "-"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {product.trueCost !== null ? (
                        `${currencySymbol}${product.trueCost.toFixed(2)}`
                      ) : (
                        <span className="text-muted-foreground">No recipe</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {currencySymbol}{product.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.newPrice}
                        onChange={(e) => updatePrice(product.id, e.target.value)}
                        className="w-24 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {product.newMarginPercent !== null ? (
                        <span
                          className={
                            belowTarget ? "text-orange-600 font-medium" : "text-green-600"
                          }
                        >
                          {belowTarget && <AlertTriangle className="h-4 w-4 inline mr-1" />}
                          {product.newMarginPercent.toFixed(1)}%
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {product.trueCost && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => calculateFromMarkup(product.id, 100)}
                            title="2x cost"
                          >
                            2x
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => calculateFromMarkup(product.id, 200)}
                            title="3x cost"
                          >
                            3x
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
