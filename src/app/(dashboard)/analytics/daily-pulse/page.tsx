"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Save, RefreshCw } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface DailyPulseData {
  date: string
  revenue: number
  transactions: number
  avgTicket: number
  upsellsAttempted: number
  upsellsConverted: number
  weather: string | null
  courtStatus: string | null
  bestSeller: string | null
  waste: string | null
  vibe: string | null
  oneThing: string | null
  isNew?: boolean
}

export default function DailyPulsePage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])
  const [data, setData] = useState<DailyPulseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/daily-pulse?date=${date}`)
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error("Failed to fetch daily pulse", error)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSave() {
    if (!data) return

    setSaving(true)
    try {
      const res = await fetch("/api/analytics/daily-pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, date }),
      })

      if (res.ok) {
        toast.success("Daily pulse saved!")
        fetchData()
      } else {
        toast.error("Failed to save daily pulse")
      }
    } catch {
      toast.error("Failed to save daily pulse")
    } finally {
      setSaving(false)
    }
  }

  function updateField<K extends keyof DailyPulseData>(field: K, value: DailyPulseData[K]) {
    if (!data) return
    setData({ ...data, [field]: value })
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
        {/* Breadcrumb skeleton */}
        <Skeleton className="h-4 w-40" />
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        {/* Today's Numbers card skeleton */}
        <Card>
          <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Upsell Tracking card skeleton */}
        <Card>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Context card skeleton */}
        <Card>
          <CardHeader><Skeleton className="h-5 w-20" /></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Quick Notes card skeleton */}
        <Card>
          <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Save button skeleton */}
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList className="flex-wrap">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/analytics">Analytics</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Daily Pulse</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Daily Pulse</h1>
          <p className="text-muted-foreground">Quick 2-minute end-of-day check-in</p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full sm:w-40"
        />
      </div>

      {data && (
        <div className="space-y-6">
          {/* Auto-calculated metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today&apos;s Numbers</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Revenue</Label>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums">₱{data.revenue.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Transactions</Label>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums">{data.transactions}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Avg Ticket</Label>
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums">₱{data.avgTicket}</p>
              </div>
            </CardContent>
          </Card>

          {/* Upsell tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upsell Tracking</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Upsells Attempted</Label>
                <Input
                  type="number"
                  value={data.upsellsAttempted}
                  onChange={(e) => updateField("upsellsAttempted", parseInt(e.target.value) || 0)}
                  placeholder="How many times did you ask?"
                />
              </div>
              <div className="space-y-2">
                <Label>Upsells Converted</Label>
                <Input
                  type="number"
                  value={data.upsellsConverted}
                  onChange={(e) => updateField("upsellsConverted", parseInt(e.target.value) || 0)}
                  placeholder="How many said yes?"
                />
              </div>
            </CardContent>
          </Card>

          {/* Context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Context</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weather</Label>
                <Select
                  value={data.weather || ""}
                  onValueChange={(v) => updateField("weather", v)}
                >
                  <SelectTrigger aria-label="Weather">
                    <SelectValue placeholder="Select weather" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sunny">☀️ Sunny</SelectItem>
                    <SelectItem value="Cloudy">⛅ Cloudy</SelectItem>
                    <SelectItem value="Rainy">🌧️ Rainy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Court Status</Label>
                <Select
                  value={data.courtStatus || ""}
                  onValueChange={(v) => updateField("courtStatus", v)}
                >
                  <SelectTrigger aria-label="Court status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal day</SelectItem>
                    <SelectItem value="Tournament">Tournament</SelectItem>
                    <SelectItem value="League Night">League night</SelectItem>
                    <SelectItem value="Private Event">Private event</SelectItem>
                    <SelectItem value="Closed">Court closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Quick notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Best Seller Today</Label>
                <Input
                  value={data.bestSeller || ""}
                  onChange={(e) => updateField("bestSeller", e.target.value)}
                  placeholder="What sold most today?"
                />
              </div>
              <div className="space-y-2">
                <Label>Waste / Spoilage</Label>
                <Input
                  value={data.waste || ""}
                  onChange={(e) => updateField("waste", e.target.value)}
                  placeholder="What got thrown away?"
                />
              </div>
            </CardContent>
          </Card>

          {/* Vibe check */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vibe Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>How did today feel?</Label>
                <Select
                  value={data.vibe || ""}
                  onValueChange={(v) => updateField("vibe", v)}
                >
                  <SelectTrigger aria-label="How did today feel?">
                    <SelectValue placeholder="Select vibe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Crushed it">🚀 Crushed it</SelectItem>
                    <SelectItem value="Good">👍 Good</SelectItem>
                    <SelectItem value="Meh">😐 Meh</SelectItem>
                    <SelectItem value="Rough">😩 Rough</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>One thing to do differently tomorrow</Label>
                <Textarea
                  value={data.oneThing || ""}
                  onChange={(e) => updateField("oneThing", e.target.value)}
                  placeholder="What's the one thing you'd change?"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Daily Pulse
          </Button>
        </div>
      )}
    </div>
  )
}
