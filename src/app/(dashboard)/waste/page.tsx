"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, RefreshCw, AlertTriangle, TrendingDown } from "lucide-react"
import { toast } from "sonner"

interface WasteLog {
  id: number
  date: string
  ingredientId: number
  ingredientName: string
  quantity: number
  unit: string
  reason: string
  estimatedCost: number
  preventable: boolean
  notes: string | null
}

interface WasteResponse {
  items: WasteLog[]
  summary: {
    totalEntries: number
    totalCost: number
    preventableCost: number
    preventablePercent: number
  }
}

interface Ingredient {
  id: number
  name: string
  unit: string
  costPerUnit: number
}

const WASTE_REASONS = [
  "Expired",
  "Spoiled",
  "Overproduction",
  "Prep Waste",
  "Dropped/Spilled",
  "Quality Issue",
  "Customer Return",
  "Other",
]

export default function WastePage() {
  const [data, setData] = useState<WasteResponse | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Date filter
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split("T")[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0])

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [ingredientId, setIngredientId] = useState<string>("")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [preventable, setPreventable] = useState(false)
  const [notes, setNotes] = useState("")

  const selectedIngredient = ingredients.find((i) => i.id.toString() === ingredientId)
  const estimatedCost = selectedIngredient
    ? (parseFloat(quantity) || 0) * selectedIngredient.costPerUnit
    : 0

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [wasteRes, ingredientsRes] = await Promise.all([
        fetch(`/api/waste?dateFrom=${dateFrom}&dateTo=${dateTo}`),
        fetch("/api/ingredients"),
      ])
      setData(await wasteRes.json())
      setIngredients(await ingredientsRes.json())
    } catch (error) {
      console.error("Failed to fetch data", error)
      toast.error("Failed to load waste logs")
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function openForm() {
    setDate(new Date().toISOString().split("T")[0])
    setIngredientId("")
    setQuantity("")
    setReason("")
    setPreventable(false)
    setNotes("")
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ingredientId || !quantity || !reason) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          ingredientId: parseInt(ingredientId),
          quantity: parseFloat(quantity),
          reason,
          preventable,
          notes: notes || null,
        }),
      })

      if (!res.ok) throw new Error("Failed")

      toast.success("Waste logged")
      closeForm()
      fetchData()
    } catch {
      toast.error("Failed to log waste")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const summary = data?.summary
  const items = data?.items || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Waste Log</h1>
          <p className="text-muted-foreground">Track waste to reduce spoilage costs</p>
        </div>
        <Button onClick={openForm}>
          <Plus className="h-4 w-4 mr-2" /> Log Waste
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalEntries}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Waste Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                ₱{summary.totalCost.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Preventable Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">
                ₱{summary.preventableCost.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Preventable %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {summary.preventablePercent}%
                {summary.preventablePercent > 50 && (
                  <Badge variant="destructive" className="ml-2">High</Badge>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date Filters */}
      <div className="flex gap-4 items-end">
        <div className="space-y-2">
          <Label>From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Ingredient</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Est. Cost</TableHead>
            <TableHead>Preventable</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {new Date(item.date).toLocaleDateString()}
              </TableCell>
              <TableCell className="font-medium">{item.ingredientName}</TableCell>
              <TableCell className="text-right">
                {item.quantity} {item.unit}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{item.reason}</Badge>
              </TableCell>
              <TableCell className="text-right text-red-600">
                ₱{item.estimatedCost.toFixed(2)}
              </TableCell>
              <TableCell>
                {item.preventable ? (
                  <Badge variant="destructive">Yes</Badge>
                ) : (
                  <Badge variant="secondary">No</Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                {item.notes || "—"}
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No waste entries for this period.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Log Waste Dialog */}
      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Waste</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Ingredient *</Label>
              <Select value={ingredientId} onValueChange={setIngredientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id.toString()}>
                      {ing.name} ({ing.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  required
                />
                {selectedIngredient && (
                  <p className="text-xs text-muted-foreground">
                    Unit: {selectedIngredient.unit}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Est. Cost</Label>
                <p className="text-lg font-semibold text-red-600 pt-2">
                  ₱{estimatedCost.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {WASTE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="preventable"
                checked={preventable}
                onCheckedChange={setPreventable}
              />
              <Label htmlFor="preventable" className="font-normal">
                Was this preventable?
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What caused this? How can we prevent it?"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Log Waste"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
