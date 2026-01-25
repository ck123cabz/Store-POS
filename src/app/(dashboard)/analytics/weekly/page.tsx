"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, RefreshCw } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface WeeklyScorecardData {
  weekStarting: string
  totalRevenue: number
  totalTransactions: number
  avgTicket: number
  foodCostPercent?: number
  laborHours?: number
  revPerLaborHour?: number
  wasteCost?: number
  spoilagePercent?: number
  repeatCustomers?: number
  repeatRatePercent?: number
  destinationPercent?: number
  upsellAttempts?: number
  upsellConversions?: number
  upsellRatePercent?: number
  bestDaypart?: string
  worstDaypart?: string
  weekFocus?: string
  heroItemPushed?: string
  winOfWeek?: string
  problemToSolve?: string
  overallHealth?: string
  isNew?: boolean
}

// Get Monday of current week
function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split("T")[0]
}

const LEVER_OPTIONS = [
  { value: "1. Unit Economics", label: "1. Unit Economics" },
  { value: "2. Traffic Source", label: "2. Traffic Source" },
  { value: "3. Ticket Size", label: "3. Ticket Size" },
  { value: "4. Menu Focus", label: "4. Menu Focus" },
  { value: "5. Daypart Economics", label: "5. Daypart Economics" },
  { value: "6. Cash Conversion", label: "6. Cash Conversion" },
  { value: "7. Repeat Rate", label: "7. Repeat Rate" },
  { value: "8. Labor Leverage", label: "8. Labor Leverage" },
  { value: "9. Differentiation", label: "9. Differentiation" },
  { value: "10. Sequencing", label: "10. Sequencing" },
]

export default function WeeklyScorecardPage() {
  const [weekStart, setWeekStart] = useState(getWeekStart)
  const [data, setData] = useState<WeeklyScorecardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/weekly-scorecard?weekStart=${weekStart}`)
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error("Failed to fetch weekly scorecard", error)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSave() {
    if (!data) return

    setSaving(true)
    try {
      const res = await fetch("/api/analytics/weekly-scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, weekStarting: weekStart }),
      })

      if (res.ok) {
        toast.success("Weekly scorecard saved!")
        fetchData()
      } else {
        toast.error("Failed to save weekly scorecard")
      }
    } catch {
      toast.error("Failed to save weekly scorecard")
    } finally {
      setSaving(false)
    }
  }

  function updateField<K extends keyof WeeklyScorecardData>(field: K, value: WeeklyScorecardData[K]) {
    if (!data) return
    setData({ ...data, [field]: value })
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/analytics">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Weekly Scorecard</h1>
          <p className="text-muted-foreground">10-Lever tracking for the week</p>
        </div>
        <Input
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className="w-40"
        />
      </div>

      {data && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Week Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Total Revenue</Label>
                <p className="text-xl font-bold">₱{data.totalRevenue?.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Transactions</Label>
                <p className="text-xl font-bold">{data.totalTransactions}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Avg Ticket</Label>
                <p className="text-xl font-bold">₱{data.avgTicket}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Rev/Labor Hr</Label>
                <p className="text-xl font-bold">₱{data.revPerLaborHour || 0}</p>
              </div>
            </CardContent>
          </Card>

          {/* Lever Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Lever 6: Cash Conversion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Waste Cost</Label>
                  <p className="font-semibold">₱{data.wasteCost || 0}</p>
                </div>
                <div>
                  <Label className="text-xs">Spoilage Rate</Label>
                  <p className="font-semibold">{data.spoilagePercent || 0}% <span className="text-muted-foreground">(target &lt;5%)</span></p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Lever 7: Repeat Rate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Repeat Customers</Label>
                  <p className="font-semibold">{data.repeatCustomers || 0}</p>
                </div>
                <div>
                  <Label className="text-xs">Repeat Rate</Label>
                  <p className="font-semibold">{data.repeatRatePercent || 0}% <span className="text-muted-foreground">(target 40%+)</span></p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Lever 5: Daypart Economics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Best Daypart</Label>
                  <p className="font-semibold">{data.bestDaypart || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs">Worst Daypart</Label>
                  <p className="font-semibold">{data.worstDaypart || "N/A"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Lever 3: Upsells</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Attempts</Label>
                  <Input
                    type="number"
                    value={data.upsellAttempts || 0}
                    onChange={(e) => updateField("upsellAttempts", parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Conversions</Label>
                  <Input
                    type="number"
                    value={data.upsellConversions || 0}
                    onChange={(e) => updateField("upsellConversions", parseInt(e.target.value) || 0)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Focus & Reflection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Focus & Reflection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>This Week&apos;s Focus (Lever)</Label>
                  <Select
                    value={data.weekFocus || ""}
                    onValueChange={(v) => updateField("weekFocus", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Which lever?" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hero Item Pushed</Label>
                  <Input
                    value={data.heroItemPushed || ""}
                    onChange={(e) => updateField("heroItemPushed", e.target.value)}
                    placeholder="What item did you promote?"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Win of the Week</Label>
                <Textarea
                  value={data.winOfWeek || ""}
                  onChange={(e) => updateField("winOfWeek", e.target.value)}
                  placeholder="What worked well? Celebrate small wins."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Problem to Solve Next Week</Label>
                <Textarea
                  value={data.problemToSolve || ""}
                  onChange={(e) => updateField("problemToSolve", e.target.value)}
                  placeholder="What's the #1 issue to fix?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Overall Health</Label>
                <Select
                  value={data.overallHealth || ""}
                  onValueChange={(v) => updateField("overallHealth", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How did this week feel?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Great">🟢 Great</SelectItem>
                    <SelectItem value="Okay">🟡 Okay</SelectItem>
                    <SelectItem value="Struggling">🔴 Struggling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Weekly Scorecard
          </Button>
        </div>
      )}
    </div>
  )
}
