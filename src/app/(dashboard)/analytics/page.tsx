"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FilterPills } from "@/components/ui/filter-pills"
import { Skeleton } from "@/components/ui/skeleton"
import { SummaryCard, SummaryCardGrid } from "@/components/ui/summary-card"
import type { TrendDirection } from "@/components/ui/summary-card"
import { EmptyState } from "@/components/ui/empty-state"
import { BarChart3 } from "lucide-react"

// ---------- Types ----------

interface DashboardData {
  period: {
    type: string
    start: string
    end: string
    today: string
  }
  summary: {
    revenue: number
    transactions: number
    avgTicket: number
    foodCostPercent: number
  }
  previousPeriod: {
    revenue: number
    transactions: number
    avgTicket: number
    foodCostPercent: number
  }
  dayparts: Array<{
    name: string
    revenue: number
    transactions: number
    avgTicket: number
  }>
  topItems: Array<{
    name: string
    quantity: number
    revenue: number
  }>
}

type PeriodValue = "today" | "week" | "month" | "quarter"

// ---------- Constants ----------

const PERIOD_OPTIONS = [
  { label: "Today", value: "today" as const },
  { label: "This Week", value: "week" as const },
  { label: "This Month", value: "month" as const },
  { label: "This Quarter", value: "quarter" as const },
]

const PERIOD_LABELS = Object.fromEntries(
  PERIOD_OPTIONS.map(({ value, label }) => [value, label])
) as Record<PeriodValue, string>

// Monochromatic bar opacities for daypart chart
const DAYPART_OPACITIES = [0.5, 0.7, 0.85, 1.0]

// ---------- Helpers ----------

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function computeTrend(
  current: number,
  previous: number,
  invertedIsBetter = false
): { trend: TrendDirection; trendLabel: string } {
  if (previous === 0) {
    return { trend: "neutral", trendLabel: "No prior data" }
  }

  const change = ((current - previous) / previous) * 100

  if (Math.abs(change) < 0.5) {
    return { trend: "neutral", trendLabel: "No change" }
  }

  const sign = change > 0 ? "+" : ""
  const label = `${sign}${change.toFixed(1)}% vs prior`

  if (invertedIsBetter) {
    // For food cost: lower is better, so a decrease shows green (up arrow)
    const trend: TrendDirection = change < 0 ? "up" : "down"
    return { trend, trendLabel: label }
  }

  const trend: TrendDirection = change > 0 ? "up" : "down"
  return { trend, trendLabel: label }
}

// ---------- Chart tooltip ----------

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  formatter?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  const format = formatter || formatCurrency
  return (
    <div className="bg-popover text-popover-foreground rounded-md px-3 py-2 text-sm shadow-[var(--shadow-float)]">
      <p className="font-medium">{label}</p>
      <p className="font-mono tabular-nums">{format(payload[0].value)}</p>
    </div>
  )
}

// ---------- Skeleton loading ----------

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      {/* FilterPills skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>

      {/* SummaryCards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="gap-0 p-4 py-4 shadow-none">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-7 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-none">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-md" />
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------- Main Page ----------

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodValue>("week")

  const fetchData = useCallback(async (p: PeriodValue) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/dashboard?period=${p}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error("Failed to fetch dashboard data", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(period)
  }, [period, fetchData])

  function handlePeriodChange(value: string | null) {
    if (value && ["today", "week", "month", "quarter"].includes(value)) {
      setPeriod(value as PeriodValue)
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Failed to load dashboard data.</p>
      </div>
    )
  }

  const { summary, previousPeriod, dayparts, topItems } = data

  // Compute trends
  const revenueTrend = computeTrend(summary.revenue, previousPeriod.revenue)
  const transactionsTrend = computeTrend(summary.transactions, previousPeriod.transactions)
  const aovTrend = computeTrend(summary.avgTicket, previousPeriod.avgTicket)
  const foodCostTrend = computeTrend(summary.foodCostPercent, previousPeriod.foodCostPercent, true)

  const periodLabel = PERIOD_LABELS[period]

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex gap-2">
          <Link href="/analytics/daily-pulse">
            <Button variant="outline" size="sm">Daily Pulse</Button>
          </Link>
          <Link href="/analytics/weekly">
            <Button variant="outline" size="sm">Weekly Scorecard</Button>
          </Link>
        </div>
      </div>

      {/* FilterPills */}
      <FilterPills
        options={PERIOD_OPTIONS}
        value={period}
        onChange={handlePeriodChange}
        ariaLabel="Time period filter"
      />

      {/* Summary Cards */}
      <SummaryCardGrid>
        <SummaryCard
          label={`${periodLabel} Revenue`}
          value={formatCurrency(summary.revenue)}
          trend={revenueTrend.trend}
          trendLabel={revenueTrend.trendLabel}
        />
        <SummaryCard
          label="Transactions"
          value={summary.transactions.toLocaleString()}
          trend={transactionsTrend.trend}
          trendLabel={transactionsTrend.trendLabel}
        />
        <SummaryCard
          label="Avg Order Value"
          value={formatCurrency(summary.avgTicket)}
          trend={aovTrend.trend}
          trendLabel={aovTrend.trendLabel}
        />
        <SummaryCard
          label="Food Cost %"
          value={formatPercent(summary.foodCostPercent)}
          trend={foodCostTrend.trend}
          trendLabel={foodCostTrend.trendLabel}
        />
      </SummaryCardGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Daypart */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Revenue by Daypart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dayparts}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      fill: "var(--color-muted-foreground)",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      fill: "var(--color-muted-foreground)",
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`}
                    width={50}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "var(--color-accent)", opacity: 0.5 }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {dayparts.map((_entry, index) => (
                      <Cell
                        key={`daypart-${index}`}
                        fill="var(--color-primary)"
                        fillOpacity={DAYPART_OPACITIES[index % DAYPART_OPACITIES.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {topItems.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="h-10 w-10" />}
                  title="No sales data for this period"
                  description="Transactions will appear here once sales begin."
                  className="py-6"
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topItems}
                    layout="vertical"
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        fill: "var(--color-muted-foreground)",
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `₱${v.toLocaleString()}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        fill: "var(--color-muted-foreground)",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={100}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: "var(--color-accent)", opacity: 0.5 }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {topItems.map((_entry, index) => (
                        <Cell
                          key={`product-${index}`}
                          fill="var(--color-primary)"
                          fillOpacity={1 - index * 0.15}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
