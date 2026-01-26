# Phase 6: Reporting & Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add calendar views, enhanced transaction history, audit log viewer, settings views, updated permissions, mobile responsiveness, and first-time user onboarding to complete the reporting and polish phase.

**Architecture:** Client-side React pages fetch data from Next.js API routes backed by Prisma/PostgreSQL. New pages follow existing patterns: client components with useState/useEffect for data fetching, shadcn/ui components for UI, and toast notifications for feedback. We'll add recharts for the peak hours heatmap visualization.

**Tech Stack:** Next.js 16, React 19, Prisma 7, PostgreSQL, shadcn/ui (Radix), Tailwind CSS v4, recharts (new), date-fns, lucide-react

---

## Prerequisites

Before starting, ensure the worktree is set up and dependencies are installed:

```bash
cd /Users/s0mebody/Desktop/dev/projects/Store-POS/.worktrees/phase6-reporting-polish
npm install
```

---

## Task 1: Add recharts dependency

**Files:**
- Modify: `package.json`

**Step 1: Install recharts**

Run: `npm install recharts`

**Step 2: Verify installation**

Run: `npm ls recharts`
Expected: Shows `recharts@2.x.x` installed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts for data visualization"
```

---

## Task 2: Create Calendar API endpoint

**Files:**
- Create: `src/app/api/calendar/route.ts`

**Step 1: Create the calendar API route**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const yearParam = searchParams.get("year")
    const monthParam = searchParams.get("month")

    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()
    const month = monthParam ? parseInt(monthParam) : new Date().getMonth()

    const startDate = startOfMonth(new Date(year, month))
    const endDate = endOfMonth(new Date(year, month))

    // Get all transactions for the month
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 1, // Only completed transactions
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        daypart: true,
        itemCount: true,
      },
    })

    // Get daily pulse data for the month
    const dailyPulses = await prisma.dailyPulse.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Aggregate by day
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    const calendarData = days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd")
      const dayTransactions = transactions.filter(
        (t) => format(new Date(t.createdAt), "yyyy-MM-dd") === dateStr
      )
      const pulse = dailyPulses.find(
        (p) => format(new Date(p.date), "yyyy-MM-dd") === dateStr
      )

      const revenue = dayTransactions.reduce(
        (sum, t) => sum + Number(t.total),
        0
      )
      const transactionCount = dayTransactions.length
      const avgTicket = transactionCount > 0 ? revenue / transactionCount : 0

      return {
        date: dateStr,
        dayOfMonth: day.getDate(),
        dayOfWeek: day.getDay(),
        revenue: Math.round(revenue * 100) / 100,
        transactions: transactionCount,
        avgTicket: Math.round(avgTicket * 100) / 100,
        vibe: pulse?.vibe || null,
        bestSeller: pulse?.bestSeller || null,
        weather: pulse?.weather || null,
        hasPulse: !!pulse,
      }
    })

    // Calculate month summary
    const totalRevenue = calendarData.reduce((sum, d) => sum + d.revenue, 0)
    const totalTransactions = calendarData.reduce((sum, d) => sum + d.transactions, 0)
    const daysWithSales = calendarData.filter((d) => d.transactions > 0).length

    return NextResponse.json({
      year,
      month,
      monthName: format(startDate, "MMMM yyyy"),
      days: calendarData,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTransactions,
        avgDailyRevenue: daysWithSales > 0
          ? Math.round((totalRevenue / daysWithSales) * 100) / 100
          : 0,
        avgTicket: totalTransactions > 0
          ? Math.round((totalRevenue / totalTransactions) * 100) / 100
          : 0,
        daysWithSales,
      },
    })
  } catch (error) {
    console.error("Failed to fetch calendar data:", error)
    return NextResponse.json({ error: "Failed to fetch calendar data" }, { status: 500 })
  }
}
```

**Step 2: Test the API**

Run: `npm run dev` (in background)
Then: `curl "http://localhost:3000/api/calendar?year=2025&month=0" | jq .`
Expected: JSON response with `days` array and `summary` object

**Step 3: Commit**

```bash
git add src/app/api/calendar/route.ts
git commit -m "feat(api): add calendar endpoint for month overview"
```

---

## Task 3: Create Calendar day detail API endpoint

**Files:**
- Create: `src/app/api/calendar/[date]/route.ts`

**Step 1: Create the day detail API route**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, parseISO } from "date-fns"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params
    const targetDate = parseISO(date)
    const dayStart = startOfDay(targetDate)
    const dayEnd = endOfDay(targetDate)

    // Get all transactions for the day
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: 1,
      },
      include: {
        items: true,
        user: {
          select: { id: true, fullname: true },
        },
        customer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    // Get daily pulse for this day
    const pulse = await prisma.dailyPulse.findUnique({
      where: { date: dayStart },
    })

    // Aggregate by hour for peak hours
    const hourlyData: Record<number, { transactions: number; revenue: number }> = {}
    for (let h = 0; h < 24; h++) {
      hourlyData[h] = { transactions: 0, revenue: 0 }
    }
    transactions.forEach((t) => {
      const hour = new Date(t.createdAt).getHours()
      hourlyData[hour].transactions += 1
      hourlyData[hour].revenue += Number(t.total)
    })

    // Aggregate by daypart
    const daypartData: Record<string, { transactions: number; revenue: number }> = {
      Morning: { transactions: 0, revenue: 0 },
      Midday: { transactions: 0, revenue: 0 },
      Afternoon: { transactions: 0, revenue: 0 },
      Evening: { transactions: 0, revenue: 0 },
    }
    transactions.forEach((t) => {
      const dp = t.daypart || "Evening"
      if (daypartData[dp]) {
        daypartData[dp].transactions += 1
        daypartData[dp].revenue += Number(t.total)
      }
    })

    // Top products
    const productCounts: Record<string, { name: string; quantity: number; revenue: number }> = {}
    transactions.forEach((t) => {
      t.items.forEach((item) => {
        if (!productCounts[item.productName]) {
          productCounts[item.productName] = { name: item.productName, quantity: 0, revenue: 0 }
        }
        productCounts[item.productName].quantity += item.quantity
        productCounts[item.productName].revenue += Number(item.price) * item.quantity
      })
    })
    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.total), 0)
    const avgTicket = transactions.length > 0 ? totalRevenue / transactions.length : 0

    return NextResponse.json({
      date,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        transactions: transactions.length,
        avgTicket: Math.round(avgTicket * 100) / 100,
      },
      hourlyBreakdown: Object.entries(hourlyData).map(([hour, data]) => ({
        hour: parseInt(hour),
        ...data,
        revenue: Math.round(data.revenue * 100) / 100,
      })),
      daypartBreakdown: Object.entries(daypartData).map(([daypart, data]) => ({
        daypart,
        ...data,
        revenue: Math.round(data.revenue * 100) / 100,
      })),
      topProducts,
      pulse: pulse
        ? {
            vibe: pulse.vibe,
            weather: pulse.weather,
            courtStatus: pulse.courtStatus,
            bestSeller: pulse.bestSeller,
            waste: pulse.waste,
            oneThing: pulse.oneThing,
          }
        : null,
      transactions: transactions.map((t) => ({
        id: t.id,
        orderNumber: t.orderNumber,
        total: Number(t.total),
        itemCount: t.itemCount,
        daypart: t.daypart,
        paymentType: t.paymentType,
        createdAt: t.createdAt,
        cashier: t.user?.fullname || "Unknown",
        customer: t.customer?.name || "Walk-in",
      })),
    })
  } catch (error) {
    console.error("Failed to fetch day detail:", error)
    return NextResponse.json({ error: "Failed to fetch day detail" }, { status: 500 })
  }
}
```

**Step 2: Test the API**

Run: `curl "http://localhost:3000/api/calendar/2025-01-26" | jq .`
Expected: JSON with `summary`, `hourlyBreakdown`, `daypartBreakdown`, `topProducts`, `transactions`

**Step 3: Commit**

```bash
git add src/app/api/calendar/[date]/route.ts
git commit -m "feat(api): add calendar day detail endpoint"
```

---

## Task 4: Create Calendar page UI

**Files:**
- Create: `src/app/(dashboard)/calendar/page.tsx`

**Step 1: Create the Calendar page component**

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { format, addMonths, subMonths } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar as CalendarIcon,
  DollarSign,
  TrendingUp,
} from "lucide-react"

interface CalendarDay {
  date: string
  dayOfMonth: number
  dayOfWeek: number
  revenue: number
  transactions: number
  avgTicket: number
  vibe: string | null
  bestSeller: string | null
  weather: string | null
  hasPulse: boolean
}

interface CalendarData {
  year: number
  month: number
  monthName: string
  days: CalendarDay[]
  summary: {
    totalRevenue: number
    totalTransactions: number
    avgDailyRevenue: number
    avgTicket: number
    daysWithSales: number
  }
}

interface DayDetail {
  date: string
  summary: {
    totalRevenue: number
    transactions: number
    avgTicket: number
  }
  hourlyBreakdown: Array<{ hour: number; transactions: number; revenue: number }>
  daypartBreakdown: Array<{ daypart: string; transactions: number; revenue: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  pulse: {
    vibe: string
    weather: string
    courtStatus: string
    bestSeller: string
    waste: string
    oneThing: string
  } | null
  transactions: Array<{
    id: number
    orderNumber: number
    total: number
    itemCount: number
    daypart: string
    paymentType: string
    createdAt: string
    cashier: string
    customer: string
  }>
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const vibeColors: Record<string, string> = {
  "Crushed it": "bg-green-500",
  Good: "bg-green-400",
  Meh: "bg-yellow-400",
  Rough: "bg-red-400",
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const res = await fetch(`/api/calendar?year=${year}&month=${month}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch calendar:", error)
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  const fetchDayDetail = useCallback(async (date: string) => {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/calendar/${date}`)
      if (res.ok) {
        setDayDetail(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch day detail:", error)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    fetchCalendar()
  }, [fetchCalendar])

  useEffect(() => {
    if (selectedDay) {
      fetchDayDetail(selectedDay.date)
    } else {
      setDayDetail(null)
    }
  }, [selectedDay, fetchDayDetail])

  function goToPreviousMonth() {
    setCurrentDate(subMonths(currentDate, 1))
  }

  function goToNextMonth() {
    setCurrentDate(addMonths(currentDate, 1))
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function formatCurrency(value: number): string {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Get first day offset for calendar grid
  const firstDayOffset = data?.days[0]?.dayOfWeek || 0

  // Find max revenue for color scaling
  const maxRevenue = data?.days.reduce((max, d) => Math.max(max, d.revenue), 0) || 1

  function getRevenueIntensity(revenue: number): string {
    if (revenue === 0) return "bg-gray-50"
    const intensity = Math.min(revenue / maxRevenue, 1)
    if (intensity > 0.75) return "bg-green-200"
    if (intensity > 0.5) return "bg-green-100"
    if (intensity > 0.25) return "bg-green-50"
    return "bg-gray-100"
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Sales Calendar
          </h1>
          <p className="text-muted-foreground">Month overview with daily performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={fetchCalendar}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Month Summary */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold">{data.summary.totalTransactions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Avg Daily</p>
              <p className="text-2xl font-bold">{formatCurrency(data.summary.avgDailyRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Avg Ticket</p>
              <p className="text-2xl font-bold">{formatCurrency(data.summary.avgTicket)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Days Active</p>
              <p className="text-2xl font-bold">{data.summary.daysWithSales}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar Grid */}
      {data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-center">{data.monthName}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Day cells */}
              {data.days.map((day) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(day)}
                  className={`aspect-square p-1 rounded-lg border transition-colors hover:border-primary ${
                    getRevenueIntensity(day.revenue)
                  } ${
                    day.date === format(new Date(), "yyyy-MM-dd")
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                >
                  <div className="h-full flex flex-col">
                    <span className="text-xs font-medium">{day.dayOfMonth}</span>
                    {day.transactions > 0 && (
                      <>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {formatCurrency(day.revenue)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {day.transactions} tx
                        </span>
                      </>
                    )}
                    {day.vibe && (
                      <div
                        className={`w-2 h-2 rounded-full mt-auto self-end ${
                          vibeColors[day.vibe] || "bg-gray-400"
                        }`}
                        title={day.vibe}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gray-50 border" /> No sales
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-50" /> Low
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-100" /> Medium
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-200" /> High
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day Detail Modal */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && format(new Date(selectedDay.date), "EEEE, MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : dayDetail ? (
            <div className="space-y-6">
              {/* Day Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <DollarSign className="h-5 w-5 mx-auto text-muted-foreground" />
                    <p className="text-2xl font-bold">{formatCurrency(dayDetail.summary.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground" />
                    <p className="text-2xl font-bold">{dayDetail.summary.transactions}</p>
                    <p className="text-xs text-muted-foreground">Transactions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <DollarSign className="h-5 w-5 mx-auto text-muted-foreground" />
                    <p className="text-2xl font-bold">{formatCurrency(dayDetail.summary.avgTicket)}</p>
                    <p className="text-xs text-muted-foreground">Avg Ticket</p>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Pulse */}
              {dayDetail.pulse && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Daily Pulse</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Vibe:</div>
                      <div>
                        <Badge variant={dayDetail.pulse.vibe === "Crushed it" || dayDetail.pulse.vibe === "Good" ? "default" : "secondary"}>
                          {dayDetail.pulse.vibe}
                        </Badge>
                      </div>
                      {dayDetail.pulse.weather && (
                        <>
                          <div className="text-muted-foreground">Weather:</div>
                          <div>{dayDetail.pulse.weather}</div>
                        </>
                      )}
                      {dayDetail.pulse.bestSeller && (
                        <>
                          <div className="text-muted-foreground">Best Seller:</div>
                          <div>{dayDetail.pulse.bestSeller}</div>
                        </>
                      )}
                      {dayDetail.pulse.oneThing && (
                        <>
                          <div className="text-muted-foreground">One Thing:</div>
                          <div>{dayDetail.pulse.oneThing}</div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Daypart Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">By Daypart</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dayDetail.daypartBreakdown.map((dp) => (
                      <div key={dp.daypart} className="flex justify-between items-center">
                        <span className="text-sm">{dp.daypart}</span>
                        <div className="text-sm text-right">
                          <span className="font-medium">{formatCurrency(dp.revenue)}</span>
                          <span className="text-muted-foreground ml-2">({dp.transactions} tx)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Products */}
              {dayDetail.topProducts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dayDetail.topProducts.map((product, i) => (
                        <div key={product.name} className="flex justify-between items-center">
                          <span className="text-sm">
                            {i + 1}. {product.name}
                          </span>
                          <div className="text-sm text-right">
                            <span className="font-medium">{formatCurrency(product.revenue)}</span>
                            <span className="text-muted-foreground ml-2">({product.quantity} sold)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No data available</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Step 2: Test the page manually**

Run: `npm run dev`
Navigate to: `http://localhost:3000/calendar`
Expected: Calendar grid with month navigation and clickable days

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/calendar/page.tsx
git commit -m "feat(ui): add calendar page with month overview and day detail modal"
```

---

## Task 5: Add Calendar to sidebar navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Add Calendar nav item**

In `src/components/layout/sidebar.tsx`, add to the imports:

```typescript
import {
  ShoppingCart,
  Package,
  FolderTree,
  Users,
  Receipt,
  Settings,
  UserCircle,
  BarChart3,
  Carrot,
  Trash2,
  Calendar,
} from "lucide-react"
```

Then add to the `navItems` array after the Analytics item:

```typescript
const navItems = [
  { href: "/pos", label: "POS", icon: ShoppingCart, permission: null },
  { href: "/transactions", label: "Transactions", icon: Receipt, permission: "permTransactions" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, permission: null },
  { href: "/calendar", label: "Calendar", icon: Calendar, permission: null },
  { href: "/products", label: "Products", icon: Package, permission: "permProducts" },
  { href: "/categories", label: "Categories", icon: FolderTree, permission: "permCategories" },
  { href: "/ingredients", label: "Ingredients", icon: Carrot, permission: "permProducts" },
  { href: "/waste", label: "Waste Log", icon: Trash2, permission: null },
  { href: "/customers", label: "Customers", icon: UserCircle, permission: null },
  { href: "/users", label: "Users", icon: Users, permission: "permUsers" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "permSettings" },
]
```

**Step 2: Verify navigation works**

Navigate to the app and confirm Calendar appears in sidebar and links to `/calendar`

**Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(ui): add Calendar to sidebar navigation"
```

---

## Task 6: Create Transaction History Today Card API

**Files:**
- Create: `src/app/api/transactions/today/route.ts`

**Step 1: Create the today summary API**

```typescript
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "date-fns"

export async function GET() {
  try {
    const today = new Date()
    const dayStart = startOfDay(today)
    const dayEnd = endOfDay(today)

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: 1,
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        daypart: true,
        itemCount: true,
        paymentType: true,
      },
    })

    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.total), 0)
    const avgTicket = transactions.length > 0 ? totalRevenue / transactions.length : 0

    // Breakdown by payment type
    const paymentBreakdown: Record<string, { count: number; total: number }> = {}
    transactions.forEach((t) => {
      const type = t.paymentType || "Other"
      if (!paymentBreakdown[type]) {
        paymentBreakdown[type] = { count: 0, total: 0 }
      }
      paymentBreakdown[type].count += 1
      paymentBreakdown[type].total += Number(t.total)
    })

    // Breakdown by daypart
    const daypartBreakdown: Record<string, { count: number; total: number }> = {
      Morning: { count: 0, total: 0 },
      Midday: { count: 0, total: 0 },
      Afternoon: { count: 0, total: 0 },
      Evening: { count: 0, total: 0 },
    }
    transactions.forEach((t) => {
      const dp = t.daypart || "Evening"
      if (daypartBreakdown[dp]) {
        daypartBreakdown[dp].count += 1
        daypartBreakdown[dp].total += Number(t.total)
      }
    })

    // Hourly data for mini chart
    const hourlyData: Array<{ hour: number; transactions: number; revenue: number }> = []
    for (let h = 0; h < 24; h++) {
      hourlyData.push({ hour: h, transactions: 0, revenue: 0 })
    }
    transactions.forEach((t) => {
      const hour = new Date(t.createdAt).getHours()
      hourlyData[hour].transactions += 1
      hourlyData[hour].revenue += Number(t.total)
    })

    // Find peak hour
    const peakHour = hourlyData.reduce(
      (max, h) => (h.revenue > max.revenue ? h : max),
      hourlyData[0]
    )

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      transactions: transactions.length,
      avgTicket: Math.round(avgTicket * 100) / 100,
      totalItems: transactions.reduce((sum, t) => sum + t.itemCount, 0),
      paymentBreakdown: Object.entries(paymentBreakdown).map(([type, data]) => ({
        type,
        count: data.count,
        total: Math.round(data.total * 100) / 100,
      })),
      daypartBreakdown: Object.entries(daypartBreakdown).map(([daypart, data]) => ({
        daypart,
        count: data.count,
        total: Math.round(data.total * 100) / 100,
      })),
      hourlyData: hourlyData.map((h) => ({
        ...h,
        revenue: Math.round(h.revenue * 100) / 100,
      })),
      peakHour: {
        hour: peakHour.hour,
        label: `${peakHour.hour}:00`,
        transactions: peakHour.transactions,
        revenue: Math.round(peakHour.revenue * 100) / 100,
      },
    })
  } catch (error) {
    console.error("Failed to fetch today's transactions:", error)
    return NextResponse.json({ error: "Failed to fetch today's data" }, { status: 500 })
  }
}
```

**Step 2: Test the API**

Run: `curl "http://localhost:3000/api/transactions/today" | jq .`
Expected: JSON with `totalRevenue`, `transactions`, `hourlyData`, `peakHour`

**Step 3: Commit**

```bash
git add src/app/api/transactions/today/route.ts
git commit -m "feat(api): add today's transactions summary endpoint"
```

---

## Task 7: Create Peak Hours Heatmap API

**Files:**
- Create: `src/app/api/transactions/heatmap/route.ts`

**Step 1: Create the heatmap API**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { subDays, startOfDay, endOfDay } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const daysBack = parseInt(searchParams.get("days") || "30")

    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(new Date(), daysBack))

    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 1,
      },
      select: {
        createdAt: true,
        total: true,
      },
    })

    // Build heatmap: day of week (0-6) x hour (0-23)
    const heatmap: Array<Array<{ transactions: number; revenue: number }>> = []
    for (let day = 0; day < 7; day++) {
      heatmap[day] = []
      for (let hour = 0; hour < 24; hour++) {
        heatmap[day][hour] = { transactions: 0, revenue: 0 }
      }
    }

    transactions.forEach((t) => {
      const date = new Date(t.createdAt)
      const day = date.getDay()
      const hour = date.getHours()
      heatmap[day][hour].transactions += 1
      heatmap[day][hour].revenue += Number(t.total)
    })

    // Flatten for easier consumption
    const data: Array<{
      day: number
      dayName: string
      hour: number
      transactions: number
      revenue: number
    }> = []

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        data.push({
          day,
          dayName: dayNames[day],
          hour,
          transactions: heatmap[day][hour].transactions,
          revenue: Math.round(heatmap[day][hour].revenue * 100) / 100,
        })
      }
    }

    // Find peak times
    const sortedByTransactions = [...data].sort((a, b) => b.transactions - a.transactions)
    const peakTimes = sortedByTransactions.slice(0, 5)

    // Find slowest times (with at least some activity)
    const activeTimes = data.filter((d) => d.transactions > 0)
    const slowestTimes = activeTimes
      .sort((a, b) => a.transactions - b.transactions)
      .slice(0, 5)

    return NextResponse.json({
      period: {
        days: daysBack,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      data,
      peakTimes,
      slowestTimes,
      maxTransactions: Math.max(...data.map((d) => d.transactions)),
      maxRevenue: Math.max(...data.map((d) => d.revenue)),
    })
  } catch (error) {
    console.error("Failed to fetch heatmap data:", error)
    return NextResponse.json({ error: "Failed to fetch heatmap data" }, { status: 500 })
  }
}
```

**Step 2: Test the API**

Run: `curl "http://localhost:3000/api/transactions/heatmap?days=30" | jq .`
Expected: JSON with `data` array (168 entries for 7 days x 24 hours), `peakTimes`, `slowestTimes`

**Step 3: Commit**

```bash
git add src/app/api/transactions/heatmap/route.ts
git commit -m "feat(api): add peak hours heatmap endpoint"
```

---

## Task 8: Enhance Transaction History page with Today Card and Heatmap

**Files:**
- Modify: `src/app/(dashboard)/transactions/page.tsx`

**Step 1: Update the transactions page**

Replace the entire file with the enhanced version that includes Today Card, Quick Filters, and Peak Hours Heatmap:

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { format, subDays } from "date-fns"
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, Search, TrendingUp, DollarSign, Clock, Flame, RefreshCw } from "lucide-react"

interface TransactionItem {
  id: number
  productName: string
  price: string
  quantity: number
}

interface Transaction {
  id: number
  orderNumber: number
  total: string
  subtotal: string
  discount: string
  taxAmount: string
  status: number
  paymentType: string
  paidAmount: string
  changeAmount: string
  createdAt: string
  tillNumber: number
  refNumber: string
  customer: { id: number; name: string } | null
  user: { id: number; fullname: string }
  items: TransactionItem[]
}

interface User {
  id: number
  fullname: string
}

interface TodayData {
  totalRevenue: number
  transactions: number
  avgTicket: number
  totalItems: number
  peakHour: {
    hour: number
    label: string
    transactions: number
    revenue: number
  }
  daypartBreakdown: Array<{
    daypart: string
    count: number
    total: number
  }>
}

interface HeatmapCell {
  day: number
  dayName: string
  hour: number
  transactions: number
  revenue: number
}

interface HeatmapData {
  data: HeatmapCell[]
  peakTimes: HeatmapCell[]
  maxTransactions: number
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null)
  const [todayData, setTodayData] = useState<TodayData | null>(null)
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null)
  const [activeTab, setActiveTab] = useState("list")

  // Filters
  const [status, setStatus] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [till, setTill] = useState<string>("")

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status && status !== "all") params.append("status", status)
      if (userId && userId !== "all") params.append("userId", userId)
      if (dateFrom) params.append("dateFrom", dateFrom)
      if (dateTo) params.append("dateTo", dateTo)
      if (till) params.append("till", till)

      const res = await fetch(`/api/transactions?${params}`)
      if (res.ok) {
        setTransactions(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setLoading(false)
    }
  }, [status, userId, dateFrom, dateTo, till])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        setUsers(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }, [])

  const fetchTodayData = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions/today")
      if (res.ok) {
        setTodayData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch today's data:", error)
    }
  }, [])

  const fetchHeatmapData = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions/heatmap?days=30")
      if (res.ok) {
        setHeatmapData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch heatmap data:", error)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
    fetchUsers()
    fetchTodayData()
    fetchHeatmapData()
  }, [fetchTransactions, fetchUsers, fetchTodayData, fetchHeatmapData])

  function getStatusBadge(tx: Transaction) {
    if (tx.status === 1) {
      return <Badge variant="default">Completed</Badge>
    }
    if (tx.refNumber) {
      return <Badge variant="secondary">On Hold</Badge>
    }
    return <Badge variant="outline">Pending</Badge>
  }

  function formatCurrency(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "$0.00"
    const num = typeof value === "string" ? parseFloat(value) : value
    return `$${num.toFixed(2)}`
  }

  function handleSearch() {
    fetchTransactions()
  }

  function clearFilters() {
    setStatus("")
    setUserId("")
    setDateFrom("")
    setDateTo("")
    setTill("")
  }

  // Quick filter presets
  function setQuickFilter(preset: string) {
    const today = format(new Date(), "yyyy-MM-dd")
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd")
    const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd")

    clearFilters()

    switch (preset) {
      case "today":
        setDateFrom(today)
        setDateTo(today)
        break
      case "yesterday":
        setDateFrom(yesterday)
        setDateTo(yesterday)
        break
      case "week":
        setDateFrom(weekAgo)
        setDateTo(today)
        break
      case "completed":
        setStatus("1")
        break
      case "pending":
        setStatus("0")
        break
    }
  }

  // Heatmap color scale
  function getHeatmapColor(transactions: number, max: number): string {
    if (transactions === 0) return "bg-gray-100"
    const intensity = transactions / max
    if (intensity > 0.75) return "bg-green-500 text-white"
    if (intensity > 0.5) return "bg-green-400"
    if (intensity > 0.25) return "bg-green-300"
    if (intensity > 0.1) return "bg-green-200"
    return "bg-green-100"
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <Button variant="outline" onClick={() => { fetchTodayData(); fetchHeatmapData(); fetchTransactions(); }}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Today Summary Card */}
      {todayData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="col-span-2 md:col-span-1 bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-primary">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm font-medium">Today</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(todayData.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">{todayData.transactions} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <TrendingUp className="h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{formatCurrency(todayData.avgTicket)}</p>
              <p className="text-xs text-muted-foreground">Avg Ticket</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <Flame className="h-4 w-4 text-orange-500 mb-1" />
              <p className="text-lg font-bold">{todayData.peakHour.label}</p>
              <p className="text-xs text-muted-foreground">Peak Hour ({todayData.peakHour.transactions} tx)</p>
            </CardContent>
          </Card>
          <Card className="col-span-2">
            <CardContent className="pt-4">
              <Clock className="h-4 w-4 text-muted-foreground mb-1" />
              <div className="flex gap-4">
                {todayData.daypartBreakdown.map((dp) => (
                  <div key={dp.daypart} className="text-center">
                    <p className="text-sm font-medium">{formatCurrency(dp.total)}</p>
                    <p className="text-xs text-muted-foreground">{dp.daypart}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Transaction List</TabsTrigger>
          <TabsTrigger value="heatmap">Peak Hours Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickFilter("today")}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter("yesterday")}>
              Yesterday
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter("week")}>
              Last 7 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter("completed")}>
              Completed
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter("pending")}>
              Pending
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="1">Completed</SelectItem>
                      <SelectItem value="0">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cashier</Label>
                  <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.fullname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Till</Label>
                  <Input
                    type="number"
                    placeholder="All"
                    value={till}
                    onChange={(e) => setTill(e.target.value)}
                  />
                </div>

                <div className="flex items-end gap-2">
                  <Button onClick={handleSearch} disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? "Loading..." : "Search"}
                  </Button>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono">{tx.orderNumber}</TableCell>
                  <TableCell>
                    {format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>{tx.customer?.name || "Walk-in"}</TableCell>
                  <TableCell>{tx.user?.fullname || "Unknown"}</TableCell>
                  <TableCell>{tx.paymentType || "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(tx.total)}
                  </TableCell>
                  <TableCell>{getStatusBadge(tx)}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setViewTransaction(tx)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {loading ? "Loading..." : "No transactions found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="heatmap">
          {heatmapData && (
            <Card>
              <CardHeader>
                <CardTitle>Peak Hours (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Hour labels */}
                    <div className="flex">
                      <div className="w-12" />
                      {hours.map((h) => (
                        <div key={h} className="w-8 text-center text-xs text-muted-foreground">
                          {h}
                        </div>
                      ))}
                    </div>

                    {/* Grid */}
                    {dayNames.map((dayName, dayIndex) => (
                      <div key={dayName} className="flex items-center">
                        <div className="w-12 text-xs text-muted-foreground">{dayName}</div>
                        {hours.map((hour) => {
                          const cell = heatmapData.data.find(
                            (d) => d.day === dayIndex && d.hour === hour
                          )
                          return (
                            <div
                              key={`${dayIndex}-${hour}`}
                              className={`w-8 h-8 m-0.5 rounded text-[10px] flex items-center justify-center ${getHeatmapColor(
                                cell?.transactions || 0,
                                heatmapData.maxTransactions
                              )}`}
                              title={`${dayName} ${hour}:00 - ${cell?.transactions || 0} transactions, ${formatCurrency(cell?.revenue || 0)}`}
                            >
                              {(cell?.transactions || 0) > 0 ? cell?.transactions : ""}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Peak times summary */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Peak Times</h4>
                  <div className="flex flex-wrap gap-2">
                    {heatmapData.peakTimes.slice(0, 5).map((peak, i) => (
                      <Badge key={i} variant="secondary">
                        {peak.dayName} {peak.hour}:00 ({peak.transactions} tx)
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-gray-100" /> None
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-green-100" /> Low
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-green-300" /> Medium
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-green-500" /> High
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{viewTransaction?.orderNumber}</DialogTitle>
          </DialogHeader>
          {viewTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Date:</div>
                <div>
                  {format(new Date(viewTransaction.createdAt), "MMM d, yyyy h:mm a")}
                </div>
                <div className="text-muted-foreground">Customer:</div>
                <div>{viewTransaction.customer?.name || "Walk-in"}</div>
                <div className="text-muted-foreground">Cashier:</div>
                <div>{viewTransaction.user?.fullname || "Unknown"}</div>
                <div className="text-muted-foreground">Till:</div>
                <div>{viewTransaction.tillNumber}</div>
                <div className="text-muted-foreground">Payment:</div>
                <div>{viewTransaction.paymentType || "—"}</div>
                {viewTransaction.refNumber && (
                  <>
                    <div className="text-muted-foreground">Ref #:</div>
                    <div>{viewTransaction.refNumber}</div>
                  </>
                )}
              </div>

              <div className="border rounded p-3 space-y-2">
                <div className="font-medium">Items</div>
                {viewTransaction.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    <span>{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(viewTransaction.subtotal)}</span>
                </div>
                {viewTransaction.discount &&
                  parseFloat(viewTransaction.discount) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(viewTransaction.discount)}</span>
                    </div>
                  )}
                {viewTransaction.taxAmount &&
                  parseFloat(viewTransaction.taxAmount) > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(viewTransaction.taxAmount)}</span>
                    </div>
                  )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(viewTransaction.total)}</span>
                </div>
                {viewTransaction.paidAmount && (
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span>{formatCurrency(viewTransaction.paidAmount)}</span>
                  </div>
                )}
                {viewTransaction.changeAmount && (
                  <div className="flex justify-between">
                    <span>Change</span>
                    <span>{formatCurrency(viewTransaction.changeAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Step 2: Test the page manually**

Navigate to: `http://localhost:3000/transactions`
Expected: Today summary cards, quick filter buttons, tabbed interface with list and heatmap

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/transactions/page.tsx
git commit -m "feat(ui): enhance transactions page with today card, quick filters, and heatmap"
```

---

## Task 9: Create Ingredient Usage Report API

**Files:**
- Create: `src/app/api/reports/ingredient-usage/route.ts`

**Step 1: Create the ingredient usage report API**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { subDays, startOfDay, endOfDay, format } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const daysBack = parseInt(searchParams.get("days") || "30")
    const ingredientId = searchParams.get("ingredientId")

    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(new Date(), daysBack))

    // Build where clause
    const where: { ingredientId?: number; createdAt: { gte: Date; lte: Date } } = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (ingredientId) {
      where.ingredientId = parseInt(ingredientId)
    }

    // Get all history entries for the period
    const history = await prisma.ingredientHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            unit: true,
            category: true,
            costPerUnit: true,
          },
        },
      },
    })

    // Aggregate by ingredient
    const ingredientStats: Record<
      number,
      {
        id: number
        name: string
        unit: string
        category: string
        costPerUnit: number
        totalUsed: number
        totalAdded: number
        netChange: number
        changeCount: number
        bySource: Record<string, number>
        byReason: Record<string, number>
      }
    > = {}

    history.forEach((h) => {
      const id = h.ingredientId
      if (!ingredientStats[id]) {
        ingredientStats[id] = {
          id,
          name: h.ingredient.name,
          unit: h.ingredient.unit,
          category: h.ingredient.category,
          costPerUnit: Number(h.ingredient.costPerUnit),
          totalUsed: 0,
          totalAdded: 0,
          netChange: 0,
          changeCount: 0,
          bySource: {},
          byReason: {},
        }
      }

      const stats = ingredientStats[id]
      const oldVal = parseFloat(h.oldValue) || 0
      const newVal = parseFloat(h.newValue) || 0
      const change = newVal - oldVal

      if (h.field === "quantity") {
        if (change < 0) {
          stats.totalUsed += Math.abs(change)
        } else {
          stats.totalAdded += change
        }
        stats.netChange += change
        stats.changeCount += 1

        // Track by source
        if (!stats.bySource[h.source]) {
          stats.bySource[h.source] = 0
        }
        stats.bySource[h.source] += Math.abs(change)

        // Track by reason
        if (h.reason) {
          if (!stats.byReason[h.reason]) {
            stats.byReason[h.reason] = 0
          }
          stats.byReason[h.reason] += Math.abs(change)
        }
      }
    })

    // Convert to array and calculate costs
    const ingredients = Object.values(ingredientStats).map((stats) => ({
      ...stats,
      usageCost: Math.round(stats.totalUsed * stats.costPerUnit * 100) / 100,
      netChangeCost: Math.round(stats.netChange * stats.costPerUnit * 100) / 100,
    }))

    // Sort by usage cost descending
    ingredients.sort((a, b) => b.usageCost - a.usageCost)

    // Calculate totals
    const totalUsageCost = ingredients.reduce((sum, i) => sum + i.usageCost, 0)
    const totalAddedCost = ingredients.reduce(
      (sum, i) => sum + i.totalAdded * i.costPerUnit,
      0
    )

    // Daily breakdown
    const dailyUsage: Record<string, number> = {}
    history
      .filter((h) => h.field === "quantity")
      .forEach((h) => {
        const dateStr = format(new Date(h.createdAt), "yyyy-MM-dd")
        const change = (parseFloat(h.newValue) || 0) - (parseFloat(h.oldValue) || 0)
        if (change < 0) {
          if (!dailyUsage[dateStr]) {
            dailyUsage[dateStr] = 0
          }
          // Find ingredient cost
          const ing = ingredientStats[h.ingredientId]
          if (ing) {
            dailyUsage[dateStr] += Math.abs(change) * ing.costPerUnit
          }
        }
      })

    return NextResponse.json({
      period: {
        days: daysBack,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalUsageCost: Math.round(totalUsageCost * 100) / 100,
        totalAddedCost: Math.round(totalAddedCost * 100) / 100,
        ingredientsTracked: ingredients.length,
        totalChanges: history.length,
      },
      ingredients,
      dailyUsage: Object.entries(dailyUsage)
        .map(([date, cost]) => ({
          date,
          cost: Math.round(cost * 100) / 100,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    })
  } catch (error) {
    console.error("Failed to fetch ingredient usage report:", error)
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 })
  }
}
```

**Step 2: Test the API**

Run: `curl "http://localhost:3000/api/reports/ingredient-usage?days=30" | jq .`
Expected: JSON with `summary`, `ingredients` array, `dailyUsage` array

**Step 3: Commit**

```bash
git add src/app/api/reports/ingredient-usage/route.ts
git commit -m "feat(api): add ingredient usage report endpoint"
```

---

## Task 10: Create Audit Log API

**Files:**
- Create: `src/app/api/audit-log/route.ts`

**Step 1: Create the audit log API**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const source = searchParams.get("source")
    const userId = searchParams.get("userId")
    const ingredientId = searchParams.get("ingredientId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const skip = (page - 1) * limit

    // Build where clause
    const where: {
      source?: string
      userId?: number
      ingredientId?: number
      createdAt?: { gte?: Date; lte?: Date }
    } = {}

    if (source) {
      where.source = source
    }

    if (userId) {
      where.userId = parseInt(userId)
    }

    if (ingredientId) {
      where.ingredientId = parseInt(ingredientId)
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo + "T23:59:59.999Z")
      }
    }

    const [logs, total] = await Promise.all([
      prisma.ingredientHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              unit: true,
            },
          },
        },
      }),
      prisma.ingredientHistory.count({ where }),
    ])

    // Get distinct sources and users for filter options
    const [sources, users] = await Promise.all([
      prisma.ingredientHistory.findMany({
        select: { source: true },
        distinct: ["source"],
      }),
      prisma.ingredientHistory.findMany({
        select: { userId: true, userName: true },
        distinct: ["userId"],
      }),
    ])

    return NextResponse.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      filters: {
        sources: sources.map((s) => s.source),
        users: users.map((u) => ({ id: u.userId, name: u.userName })),
      },
      logs: logs.map((log) => ({
        id: log.id,
        changeId: log.changeId,
        ingredientId: log.ingredientId,
        ingredientName: log.ingredientName,
        unit: log.ingredient.unit,
        field: log.field,
        oldValue: log.oldValue,
        newValue: log.newValue,
        change: log.field === "quantity"
          ? (parseFloat(log.newValue) - parseFloat(log.oldValue)).toFixed(2)
          : null,
        source: log.source,
        reason: log.reason,
        reasonNote: log.reasonNote,
        userId: log.userId,
        userName: log.userName,
        createdAt: log.createdAt,
      })),
    })
  } catch (error) {
    console.error("Failed to fetch audit log:", error)
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 })
  }
}
```

**Step 2: Test the API**

Run: `curl "http://localhost:3000/api/audit-log?page=1&limit=10" | jq .`
Expected: JSON with `logs` array, `filters` object, pagination fields

**Step 3: Commit**

```bash
git add src/app/api/audit-log/route.ts
git commit -m "feat(api): add audit log endpoint for ingredient history"
```

---

## Task 11: Create Audit Log Viewer page

**Files:**
- Create: `src/app/(dashboard)/audit-log/page.tsx`

**Step 1: Create the Audit Log page**

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { RefreshCw, Search, History, ChevronLeft, ChevronRight } from "lucide-react"

interface AuditLog {
  id: number
  changeId: string
  ingredientId: number
  ingredientName: string
  unit: string
  field: string
  oldValue: string
  newValue: string
  change: string | null
  source: string
  reason: string | null
  reasonNote: string | null
  userId: number
  userName: string
  createdAt: string
}

interface AuditData {
  page: number
  limit: number
  total: number
  totalPages: number
  filters: {
    sources: string[]
    users: Array<{ id: number; name: string }>
  }
  logs: AuditLog[]
}

const sourceLabels: Record<string, { label: string; color: string }> = {
  manual_edit: { label: "Manual Edit", color: "bg-blue-100 text-blue-800" },
  sale: { label: "Sale", color: "bg-green-100 text-green-800" },
  inventory_count: { label: "Inventory Count", color: "bg-purple-100 text-purple-800" },
  restock: { label: "Restock", color: "bg-orange-100 text-orange-800" },
  import: { label: "Import", color: "bg-gray-100 text-gray-800" },
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Filters
  const [source, setSource] = useState("")
  const [userId, setUserId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", "50")
      if (source && source !== "all") params.append("source", source)
      if (userId && userId !== "all") params.append("userId", userId)
      if (dateFrom) params.append("dateFrom", dateFrom)
      if (dateTo) params.append("dateTo", dateTo)

      const res = await fetch(`/api/audit-log?${params}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch audit log:", error)
    } finally {
      setLoading(false)
    }
  }, [page, source, userId, dateFrom, dateTo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function handleSearch() {
    setPage(1)
    fetchLogs()
  }

  function clearFilters() {
    setSource("")
    setUserId("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  function getSourceBadge(src: string) {
    const info = sourceLabels[src] || { label: src, color: "bg-gray-100 text-gray-800" }
    return (
      <Badge variant="outline" className={info.color}>
        {info.label}
      </Badge>
    )
  }

  function formatChange(log: AuditLog): string {
    if (log.field === "quantity" && log.change) {
      const change = parseFloat(log.change)
      return change >= 0 ? `+${change} ${log.unit}` : `${change} ${log.unit}`
    }
    return `${log.oldValue} → ${log.newValue}`
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Audit Log
          </h1>
          <p className="text-muted-foreground">Track all inventory changes</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {data?.filters.sources.map((s) => (
                    <SelectItem key={s} value={s}>
                      {sourceLabels[s]?.label || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>User</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {data?.filters.users.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {data && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {data.logs.length} of {data.total} entries
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Ingredient</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell className="font-medium">{log.ingredientName}</TableCell>
                  <TableCell>
                    <span
                      className={
                        log.change && parseFloat(log.change) < 0
                          ? "text-red-600"
                          : log.change && parseFloat(log.change) > 0
                          ? "text-green-600"
                          : ""
                      }
                    >
                      {formatChange(log)}
                    </span>
                  </TableCell>
                  <TableCell>{getSourceBadge(log.source)}</TableCell>
                  <TableCell>
                    <div>
                      {log.reason && (
                        <span className="text-sm">{log.reason}</span>
                      )}
                      {log.reasonNote && (
                        <p className="text-xs text-muted-foreground">{log.reasonNote}</p>
                      )}
                      {!log.reason && !log.reasonNote && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{log.userName}</TableCell>
                </TableRow>
              ))}
              {data?.logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

**Step 2: Test the page manually**

Navigate to: `http://localhost:3000/audit-log`
Expected: Filterable table of audit log entries with pagination

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/audit-log/page.tsx
git commit -m "feat(ui): add audit log viewer page"
```

---

## Task 12: Add Audit Log to sidebar navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Add Audit Log nav item**

In `src/components/layout/sidebar.tsx`, add `History` to imports and add to `navItems`:

```typescript
import {
  ShoppingCart,
  Package,
  FolderTree,
  Users,
  Receipt,
  Settings,
  UserCircle,
  BarChart3,
  Carrot,
  Trash2,
  Calendar,
  History,
} from "lucide-react"

const navItems = [
  { href: "/pos", label: "POS", icon: ShoppingCart, permission: null },
  { href: "/transactions", label: "Transactions", icon: Receipt, permission: "permTransactions" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, permission: null },
  { href: "/calendar", label: "Calendar", icon: Calendar, permission: null },
  { href: "/products", label: "Products", icon: Package, permission: "permProducts" },
  { href: "/categories", label: "Categories", icon: FolderTree, permission: "permCategories" },
  { href: "/ingredients", label: "Ingredients", icon: Carrot, permission: "permProducts" },
  { href: "/audit-log", label: "Audit Log", icon: History, permission: "permProducts" },
  { href: "/waste", label: "Waste Log", icon: Trash2, permission: null },
  { href: "/customers", label: "Customers", icon: UserCircle, permission: null },
  { href: "/users", label: "Users", icon: Users, permission: "permUsers" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "permSettings" },
]
```

**Step 2: Verify navigation works**

Navigate to the app and confirm Audit Log appears in sidebar

**Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(ui): add Audit Log to sidebar navigation"
```

---

## Task 13: Update Prisma schema with new permission flags

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add new permission fields to User model**

In `prisma/schema.prisma`, update the User model to add new permission flags:

```prisma
model User {
  id               Int           @id @default(autoincrement())
  username         String        @unique
  password         String
  fullname         String
  permProducts     Boolean       @default(false) @map("perm_products")
  permCategories   Boolean       @default(false) @map("perm_categories")
  permTransactions Boolean       @default(false) @map("perm_transactions")
  permUsers        Boolean       @default(false) @map("perm_users")
  permSettings     Boolean       @default(false) @map("perm_settings")

  // NEW: Phase 6 permissions
  permReports      Boolean       @default(false) @map("perm_reports")
  permAuditLog     Boolean       @default(false) @map("perm_audit_log")

  status           String        @default("")
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")

  // LEVER 8: Labor Leverage
  position         String?       // Kitchen Manager, Line Cook, Server, etc.
  hourlyRate       Decimal?      @map("hourly_rate") @db.Decimal(10, 2)
  startDate        DateTime?     @map("start_date")
  employmentStatus String        @default("Active") @map("employment_status")

  // Relations
  transactions     Transaction[]
  laborLogs        LaborLog[]

  @@map("users")
}
```

**Step 2: Generate migration**

Run: `npx prisma migrate dev --name add_report_permissions`
Expected: Migration created and applied

**Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add permReports and permAuditLog permission flags"
```

---

## Task 14: Update auth to include new permissions

**Files:**
- Modify: `src/lib/auth.ts`

**Step 1: Read the current auth file**

First read the file to understand its structure.

**Step 2: Add new permissions to JWT callback**

Update the JWT and session callbacks to include the new permission flags.

In the `callbacks` section, ensure `permReports` and `permAuditLog` are included:

```typescript
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id
      token.permProducts = user.permProducts
      token.permCategories = user.permCategories
      token.permTransactions = user.permTransactions
      token.permUsers = user.permUsers
      token.permSettings = user.permSettings
      token.permReports = user.permReports
      token.permAuditLog = user.permAuditLog
    }
    return token
  },
  async session({ session, token }) {
    if (token && session.user) {
      session.user.id = token.id as string
      session.user.permProducts = token.permProducts as boolean
      session.user.permCategories = token.permCategories as boolean
      session.user.permTransactions = token.permTransactions as boolean
      session.user.permUsers = token.permUsers as boolean
      session.user.permSettings = token.permSettings as boolean
      session.user.permReports = token.permReports as boolean
      session.user.permAuditLog = token.permAuditLog as boolean
    }
    return session
  },
}
```

**Step 3: Update types**

If there's a types file or module augmentation for next-auth, add the new fields.

**Step 4: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(auth): add permReports and permAuditLog to JWT session"
```

---

## Task 15: Add mobile responsiveness to sidebar

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/header.tsx`

**Step 1: Update sidebar with mobile toggle**

Replace the sidebar component with a responsive version:

```typescript
"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ShoppingCart,
  Package,
  FolderTree,
  Users,
  Receipt,
  Settings,
  UserCircle,
  BarChart3,
  Carrot,
  Trash2,
  Calendar,
  History,
  Menu,
  X,
} from "lucide-react"

const navItems = [
  { href: "/pos", label: "POS", icon: ShoppingCart, permission: null },
  { href: "/transactions", label: "Transactions", icon: Receipt, permission: "permTransactions" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, permission: null },
  { href: "/calendar", label: "Calendar", icon: Calendar, permission: null },
  { href: "/products", label: "Products", icon: Package, permission: "permProducts" },
  { href: "/categories", label: "Categories", icon: FolderTree, permission: "permCategories" },
  { href: "/ingredients", label: "Ingredients", icon: Carrot, permission: "permProducts" },
  { href: "/audit-log", label: "Audit Log", icon: History, permission: "permAuditLog" },
  { href: "/waste", label: "Waste Log", icon: Trash2, permission: null },
  { href: "/customers", label: "Customers", icon: UserCircle, permission: null },
  { href: "/users", label: "Users", icon: Users, permission: "permUsers" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "permSettings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)

  const toggleSidebar = () => setIsOpen(!isOpen)
  const closeSidebar = () => setIsOpen(false)

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-2 left-2 z-50 md:hidden"
        onClick={toggleSidebar}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static z-40 w-56 border-r bg-gray-50 min-h-[calc(100vh-3.5rem)] transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <nav className="p-2 space-y-1 pt-12 md:pt-2">
          {navItems.map((item) => {
            // Check permission
            if (item.permission && session?.user) {
              const hasPermission = session.user[item.permission as keyof typeof session.user]
              if (!hasPermission) return null
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-gray-200 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
```

**Step 2: Test on mobile viewport**

Use browser dev tools to test at 375px width
Expected: Hamburger menu appears, sidebar slides in/out

**Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(ui): add mobile responsive sidebar with toggle"
```

---

## Task 16: Create onboarding tour component

**Files:**
- Create: `src/components/onboarding/tour.tsx`
- Create: `src/hooks/use-onboarding.ts`

**Step 1: Create the useOnboarding hook**

```typescript
// src/hooks/use-onboarding.ts
"use client"

import { useState, useEffect } from "react"

const ONBOARDING_KEY = "store-pos-onboarding-complete"

export function useOnboarding() {
  const [isComplete, setIsComplete] = useState(true) // Default to true to prevent flash
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY)
    setIsComplete(stored === "true")
    setIsLoaded(true)
  }, [])

  const markComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true")
    setIsComplete(true)
  }

  const reset = () => {
    localStorage.removeItem(ONBOARDING_KEY)
    setIsComplete(false)
  }

  return {
    isComplete,
    isLoaded,
    markComplete,
    reset,
    shouldShowTour: isLoaded && !isComplete,
  }
}
```

**Step 2: Create the Tour component**

```typescript
// src/components/onboarding/tour.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ShoppingCart,
  BarChart3,
  Package,
  Calendar,
  History,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react"
import { useOnboarding } from "@/hooks/use-onboarding"

const tourSteps = [
  {
    title: "Welcome to Store POS!",
    description: "Let's take a quick tour of the key features to help you get started.",
    icon: ShoppingCart,
    highlight: null,
  },
  {
    title: "Point of Sale",
    description: "Process sales quickly with our intuitive POS interface. Add products to cart, apply discounts, and complete transactions.",
    icon: ShoppingCart,
    highlight: "/pos",
  },
  {
    title: "Analytics Dashboard",
    description: "Track your business performance with the 10-Lever Framework. Monitor revenue, ticket size, labor costs, and more.",
    icon: BarChart3,
    highlight: "/analytics",
  },
  {
    title: "Inventory Management",
    description: "Manage your ingredients and products. Track stock levels, set par levels, and get low-stock alerts.",
    icon: Package,
    highlight: "/ingredients",
  },
  {
    title: "Sales Calendar",
    description: "View your sales performance by day. See revenue trends and daily summaries at a glance.",
    icon: Calendar,
    highlight: "/calendar",
  },
  {
    title: "Audit Log",
    description: "Track all inventory changes with a complete audit trail. See who made changes and when.",
    icon: History,
    highlight: "/audit-log",
  },
  {
    title: "Settings",
    description: "Configure your store details, tax settings, and user permissions.",
    icon: Settings,
    highlight: "/settings",
  },
  {
    title: "You're All Set!",
    description: "You can always access help from the settings menu. Enjoy using Store POS!",
    icon: ShoppingCart,
    highlight: null,
  },
]

export function OnboardingTour() {
  const { shouldShowTour, markComplete } = useOnboarding()
  const [currentStep, setCurrentStep] = useState(0)

  if (!shouldShowTour) {
    return null
  }

  const step = tourSteps[currentStep]
  const Icon = step.icon
  const isLastStep = currentStep === tourSteps.length - 1
  const isFirstStep = currentStep === 0

  function handleNext() {
    if (isLastStep) {
      markComplete()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  function handlePrevious() {
    setCurrentStep((s) => Math.max(0, s - 1))
  }

  function handleSkip() {
    markComplete()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{step.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{step.description}</p>

          {/* Progress dots */}
          <div className="flex justify-center gap-1 mt-4">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? "bg-primary" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex gap-2">
            {!isLastStep && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tour
              </Button>
            )}
            <Button onClick={handleNext}>
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/onboarding/tour.tsx src/hooks/use-onboarding.ts
git commit -m "feat(ui): add onboarding tour component for first-time users"
```

---

## Task 17: Integrate onboarding tour into layout

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Add OnboardingTour to the layout**

```typescript
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { SessionProvider } from "@/components/providers/session-provider"
import { OnboardingTour } from "@/components/onboarding/tour"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-4 md:p-4 pt-14 md:pt-4">{children}</main>
        </div>
        <OnboardingTour />
      </div>
    </SessionProvider>
  )
}
```

**Step 2: Test the onboarding tour**

Clear localStorage and navigate to the app
Expected: Tour modal appears on first visit

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx
git commit -m "feat(ui): integrate onboarding tour into dashboard layout"
```

---

## Task 18: Add Reset Tour option to Settings page

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`

**Step 1: Read the current settings page**

Read the file to understand its structure.

**Step 2: Add Reset Tour button**

Add a section to the settings page that allows users to reset the onboarding tour:

```typescript
// Add this import at the top
import { useOnboarding } from "@/hooks/use-onboarding"

// Inside the component, add:
const { reset: resetTour } = useOnboarding()

// Add this section in the UI (after other settings sections):
<Card>
  <CardHeader>
    <CardTitle>Help & Support</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">Product Tour</p>
        <p className="text-sm text-muted-foreground">
          View the onboarding tour again
        </p>
      </div>
      <Button variant="outline" onClick={resetTour}>
        Restart Tour
      </Button>
    </div>
  </CardContent>
</Card>
```

**Step 3: Test the reset functionality**

Click "Restart Tour" and verify the tour appears again

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat(ui): add reset tour option to settings page"
```

---

## Task 19: Mobile responsiveness pass for key pages

**Files:**
- Modify: `src/app/(dashboard)/transactions/page.tsx`
- Modify: `src/app/(dashboard)/calendar/page.tsx`
- Modify: `src/app/(dashboard)/analytics/page.tsx`

**Step 1: Review and fix responsive issues**

For each page, ensure:
- Grids collapse properly on mobile (grid-cols-1 sm:grid-cols-2 md:grid-cols-4)
- Tables have horizontal scroll on mobile (overflow-x-auto)
- Filter forms stack vertically on mobile
- Text doesn't overflow
- Buttons are touch-friendly (min 44px tap target)

Common patterns to apply:

```typescript
// Wrap tables
<div className="overflow-x-auto">
  <Table>...</Table>
</div>

// Responsive grids
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Responsive text
<h1 className="text-xl md:text-2xl font-bold">

// Stack filters on mobile
<div className="grid grid-cols-1 md:grid-cols-6 gap-4">
```

**Step 2: Test on multiple viewport sizes**

Test at: 375px, 768px, 1024px, 1440px

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/transactions/page.tsx src/app/\(dashboard\)/calendar/page.tsx src/app/\(dashboard\)/analytics/page.tsx
git commit -m "fix(ui): improve mobile responsiveness across key pages"
```

---

## Task 20: Final integration test and cleanup

**Step 1: Run the app and test all new features**

```bash
npm run dev
```

Test checklist:
- [ ] Calendar page loads and shows month view
- [ ] Calendar day click opens detail modal
- [ ] Transaction history shows today card
- [ ] Transaction heatmap tab works
- [ ] Audit log page loads with filtering
- [ ] Sidebar shows new navigation items
- [ ] Mobile sidebar toggle works
- [ ] Onboarding tour appears for new users
- [ ] Settings has "Restart Tour" option

**Step 2: Run linting**

```bash
npm run lint
```

Fix any linting errors.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and integration testing for Phase 6"
```

---

## Summary

Phase 6 implements:

1. **Calendar View** (`/calendar`) - Month overview with revenue heat coloring, day detail modal
2. **Transaction History Improvements** - Today summary card, quick filters, peak hours heatmap
3. **Ingredient Usage Report API** - Track ingredient usage over time with cost analysis
4. **Audit Log Viewer** (`/audit-log`) - Filterable, paginated view of all inventory changes
5. **User Permissions** - New `permReports` and `permAuditLog` flags
6. **Mobile Responsiveness** - Collapsible sidebar, responsive grids and tables
7. **Onboarding Tour** - First-time user welcome flow with feature highlights

All features follow existing codebase patterns:
- Client components with useState/useEffect
- Prisma for database queries
- shadcn/ui components
- Tailwind CSS for styling
- date-fns for date manipulation
