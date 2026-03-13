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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { SummaryCard, SummaryCardGrid } from "@/components/ui/summary-card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { StatusDot } from "@/components/ui/status-dot"
import { Plus, Trash2 as WasteIcon } from "lucide-react"
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
  baseUnitId: number
  baseUnitName: string
  avgCostPerBaseUnit: number
}

const DEFAULT_WASTE_REASONS = [
  "Expired",
  "Spoiled",
  "Overproduction",
  "Prep Waste",
  "Dropped/Spilled",
  "Quality Issue",
  "Customer Return",
  "Other",
]

const columns: DataTableColumn<WasteLog>[] = [
  {
    id: "date",
    header: "Date",
    cell: (item) => new Date(item.date).toLocaleDateString(),
    priority: 0,
  },
  {
    id: "ingredient",
    header: "Ingredient",
    cell: (item) => <span className="font-medium">{item.ingredientName}</span>,
    priority: 0,
  },
  {
    id: "quantity",
    header: "Qty",
    cell: (item) => (
      <span className="font-mono tabular-nums">
        {item.quantity} {item.unit}
      </span>
    ),
    priority: 0,
    align: "right",
  },
  {
    id: "reason",
    header: "Reason",
    cell: (item) => <Badge variant="outline">{item.reason}</Badge>,
    priority: 1,
  },
  {
    id: "cost",
    header: "Est. Cost",
    cell: (item) => (
      <span className="font-mono tabular-nums text-status-critical">
        ₱{item.estimatedCost.toFixed(2)}
      </span>
    ),
    priority: 0,
    align: "right",
  },
  {
    id: "preventable",
    header: "Preventable",
    cell: (item) => (
      <StatusDot
        variant={item.preventable ? "critical" : "neutral"}
        label={item.preventable ? "Yes" : "No"}
      />
    ),
    priority: 1,
    align: "center",
  },
  {
    id: "notes",
    header: "Notes",
    cell: (item) => (
      <span className="text-muted-foreground text-sm max-w-[200px] truncate block">
        {item.notes || "—"}
      </span>
    ),
    priority: 2,
  },
]

export default function WastePage() {
  const [data, setData] = useState<WasteResponse | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Date filter
  const [activeFilter, setActiveFilter] = useState<string | null>("7d")
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
  const [wasteReasons, setWasteReasons] = useState<string[]>(DEFAULT_WASTE_REASONS)

  const selectedIngredient = ingredients.find((i) => i.id.toString() === ingredientId)
  const estimatedCost = selectedIngredient
    ? (parseFloat(quantity) || 0) * selectedIngredient.avgCostPerBaseUnit
    : 0

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [wasteRes, ingredientsRes, settingsRes] = await Promise.all([
        fetch(`/api/waste?dateFrom=${dateFrom}&dateTo=${dateTo}`),
        fetch("/api/ingredients"),
        fetch("/api/settings"),
      ])
      setData(await wasteRes.json())
      setIngredients(await ingredientsRes.json())
      const settingsData = await settingsRes.json()
      if (Array.isArray(settingsData.wasteReasons) && settingsData.wasteReasons.length > 0) {
        setWasteReasons(settingsData.wasteReasons)
      }
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

  function handleFilterChange(value: string | null) {
    setActiveFilter(value)
    const today = new Date()
    if (value === "7d") {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      setDateFrom(d.toISOString().split("T")[0])
      setDateTo(today.toISOString().split("T")[0])
    } else if (value === "30d") {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      setDateFrom(d.toISOString().split("T")[0])
      setDateTo(today.toISOString().split("T")[0])
    } else if (value === "month") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1)
      setDateFrom(d.toISOString().split("T")[0])
      setDateTo(today.toISOString().split("T")[0])
    }
  }

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
          unitId: selectedIngredient!.baseUnitId,
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

  const summary = data?.summary
  const items = data?.items || []

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Waste Log</h1>
          <p className="text-muted-foreground mt-1">Track waste to reduce spoilage costs</p>
        </div>
        <Button onClick={openForm}>
          <Plus className="h-4 w-4 mr-2" /> Log Waste
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <SummaryCardGrid>
          <SummaryCard label="Total Entries" value={summary.totalEntries.toString()} />
          <SummaryCard
            label="Total Waste Cost"
            value={`₱${summary.totalCost.toLocaleString()}`}
          />
          <SummaryCard
            label="Preventable Cost"
            value={`₱${summary.preventableCost.toLocaleString()}`}
          />
          <SummaryCard
            label="Preventable %"
            value={`${summary.preventablePercent}%`}
            trend={summary.preventablePercent > 50 ? "down" : "neutral"}
            trendLabel={summary.preventablePercent > 50 ? "High" : "Normal"}
          />
        </SummaryCardGrid>
      )}

      {/* Date Filters + Date Inputs */}
      <div className="space-y-4">
        <ToggleGroup
          type="single"
          value={activeFilter ?? ""}
          onValueChange={(value) => handleFilterChange(value || null)}
          variant="outline"
          aria-label="Date range filters"
        >
          <ToggleGroupItem value="7d">Last 7 Days</ToggleGroupItem>
          <ToggleGroupItem value="30d">Last 30 Days</ToggleGroupItem>
          <ToggleGroupItem value="month">This Month</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex gap-4 items-end">
          <div className="space-y-2">
            <Label>From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setActiveFilter(null)
              }}
              className="w-40"
            />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setActiveFilter(null)
              }}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={items}
        rowKey={(item) => item.id}
        loading={loading}
        emptyIcon={<WasteIcon className="h-10 w-10" />}
        emptyTitle="No waste recorded"
        emptyDescription="That's a good thing! Log waste here when it happens to track trends."
      />

      {/* Log Waste Dialog */}
      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent className="sm:max-w-md">
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
                <SelectTrigger aria-label="Ingredient">
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {ingredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id.toString()}>
                      {ing.name} ({ing.baseUnitName})
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
                    Unit: {selectedIngredient.baseUnitName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Est. Cost</Label>
                <p className="text-lg font-semibold text-status-critical pt-2">
                  ₱{estimatedCost.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger aria-label="Waste reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {wasteReasons.map((r) => (
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
