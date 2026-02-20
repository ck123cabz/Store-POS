"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { format, addMonths, subMonths, isFuture, parseISO } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SummaryCard, SummaryCardGrid } from "@/components/ui/summary-card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { getVibeColorClasses, getVibeLabel, type VibeLevel } from "@/lib/vibe-colors"
import { cn } from "@/lib/utils"

// ---------- Types ----------

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

// ---------- Constants ----------

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// ---------- Helpers ----------

// T087: Cache type for vibe data per month
type MonthCacheKey = string // "year-month" format
type MonthCache = Map<MonthCacheKey, CalendarData>

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatCurrencyDecimal(value: number): string {
  return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ---------- Skeleton Loading ----------

function CalendarSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-16 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* SummaryCards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="gap-0 p-4 py-4 shadow-none">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-24" />
          </Card>
        ))}
      </div>

      {/* Calendar grid skeleton (desktop) */}
      <Card className="shadow-none hidden sm:block">
        <CardContent className="pt-6">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          {/* Day cells - 5 rows x 7 cols */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mobile list skeleton */}
      <div className="sm:hidden space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    </div>
  )
}

// ---------- Main Page ----------

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [dayDetail, setDayDetail] = useState<DayDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [_fetchError, setFetchError] = useState(false)

  // T087: Cache vibe data per month view (NFR-P07)
  const cacheRef = useRef<MonthCache>(new Map())

  // T082-T086: Fetch calendar with caching and graceful degradation
  const fetchCalendar = useCallback(async (forceRefresh = false) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const cacheKey: MonthCacheKey = `${year}-${month}`

    // T087: Check cache first (unless force refresh)
    if (!forceRefresh && cacheRef.current.has(cacheKey)) {
      setData(cacheRef.current.get(cacheKey)!)
      setLoading(false)
      return
    }

    setLoading(true)
    setFetchError(false)
    try {
      const res = await fetch(`/api/calendar?year=${year}&month=${month}`)
      if (res.ok) {
        const calendarData = await res.json()
        // T087: Store in cache
        cacheRef.current.set(cacheKey, calendarData)
        setData(calendarData)
      } else {
        throw new Error("Failed to fetch calendar")
      }
    } catch (error) {
      console.error("Failed to fetch calendar:", error)
      // T086: Graceful degradation - show neutral styling (NFR-E03)
      setFetchError(true)
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

  // Get first day offset for calendar grid
  const firstDayOffset = data?.days[0]?.dayOfWeek || 0

  // Active days for mobile list (days with transactions)
  const activeDays = data?.days.filter((d) => d.transactions > 0) ?? []

  if (loading) {
    return <CalendarSkeleton />
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? (
              <>
                {data.monthName}
                {data.year !== new Date().getFullYear() && (
                  <span className="ml-1">{data.year}</span>
                )}
                {" "}overview
              </>
            ) : (
              "Month overview with daily performance"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => fetchCalendar(true)} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Month Summary */}
      {data && (
        <SummaryCardGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard
            label="Total Revenue"
            value={formatCurrency(data.summary.totalRevenue)}
          />
          <SummaryCard
            label="Transactions"
            value={data.summary.totalTransactions.toLocaleString()}
          />
          <SummaryCard
            label="Avg Daily"
            value={formatCurrency(data.summary.avgDailyRevenue)}
          />
          <SummaryCard
            label="Avg Ticket"
            value={formatCurrency(data.summary.avgTicket)}
          />
          <SummaryCard
            label="Days Active"
            value={String(data.summary.daysWithSales)}
          />
        </SummaryCardGrid>
      )}

      {/* Calendar Grid (tablet/desktop) */}
      {data && (
        <Card className="shadow-none hidden sm:block">
          <CardHeader className="pb-2">
            {/* T088: Year boundary display with year labels (EC-21) */}
            <CardTitle className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {data.monthName}
              {data.year !== new Date().getFullYear() && (
                <span className="ml-2 font-normal">
                  {data.year}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
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

              {/* T083-T093: Day cells with vibe color coding and accessibility */}
              {data.days.map((day) => {
                const dateObj = parseISO(day.date)
                // T090: Future dates get neutral styling (EC-23)
                const isFutureDate = isFuture(dateObj)
                // T083: Get vibe color classes using utility
                const vibeClasses = getVibeColorClasses(day.vibe as VibeLevel)
                // T092: Get vibe label for tooltip (NFR-A07)
                const vibeLabel = getVibeLabel(day.vibe as VibeLevel)
                const isToday = day.date === format(new Date(), "yyyy-MM-dd")

                // Build aria-label for accessibility (T093, NFR-A07)
                const ariaLabel = [
                  format(dateObj, "MMMM d, yyyy"),
                  day.transactions > 0 ? `${formatCurrencyDecimal(day.revenue)} revenue, ${day.transactions} transactions` : "No sales",
                  day.vibe ? `Vibe: ${vibeLabel}` : null,
                  isToday ? "Today" : null,
                  isFutureDate ? "Future date" : null,
                ].filter(Boolean).join(". ")

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDay(day)}
                    // T092: Title tooltip describing vibe (NFR-A07)
                    title={day.vibe ? `${vibeLabel} day` : undefined}
                    // T093: aria-label for color-coded days (NFR-A07)
                    aria-label={ariaLabel}
                    className={cn(
                      "aspect-square p-1 rounded-lg border transition-colors hover:border-primary",
                      // T084, T085: Neutral styling first, vibe colors after data fetch (LS-11, LS-12)
                      isFutureDate
                        ? "bg-muted/30" // T090: Future dates neutral (EC-23)
                        : day.vibe
                          ? vibeClasses.bg // T083: Apply vibe background
                          : day.revenue > 0
                            ? "bg-accent" // Activity days: subtle accent tint
                            : "bg-muted/50", // No sales: muted
                      isToday && "ring-2 ring-primary",
                    )}
                  >
                    <div className="h-full flex flex-col">
                      <span className={cn(
                        "text-xs font-medium",
                        // Use appropriate text color for vibe backgrounds
                        day.vibe && !isFutureDate && vibeClasses.text
                      )}>
                        {day.dayOfMonth}
                      </span>
                      {day.transactions > 0 && (
                        <>
                          <span className={cn(
                            "text-xs font-mono tabular-nums truncate",
                            day.vibe && !isFutureDate ? vibeClasses.text : "text-muted-foreground"
                          )}>
                            {formatCurrency(day.revenue)}
                          </span>
                          <span className={cn(
                            "text-xs font-mono tabular-nums",
                            day.vibe && !isFutureDate ? vibeClasses.text : "text-muted-foreground"
                          )}>
                            {day.transactions} tx
                          </span>
                        </>
                      )}
                      {/* T089: Vibe indicator dot for quick visual (most recent vibe from API - EC-22) */}
                      {day.vibe && !isFutureDate && (
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full mt-auto self-end",
                            vibeClasses.dot
                          )}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Condensed Mobile List (phone) */}
      {data && (
        <div className="sm:hidden space-y-0">
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            {data.monthName}
            {data.year !== new Date().getFullYear() && (
              <span className="ml-1">{data.year}</span>
            )}
          </div>
          {activeDays.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No activity this month
            </p>
          ) : (
            activeDays.map((day) => {
              const dateObj = parseISO(day.date)
              const vibeClasses = getVibeColorClasses(day.vibe as VibeLevel)
              const isToday = day.date === format(new Date(), "yyyy-MM-dd")
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "w-full flex items-center justify-between py-3 px-2 border-b border-border transition-colors hover:bg-accent/50",
                    isToday && "bg-accent/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Vibe dot */}
                    {day.vibe && (
                      <div
                        className={cn("w-2 h-2 rounded-full shrink-0", vibeClasses.dot)}
                        aria-hidden="true"
                      />
                    )}
                    {!day.vibe && <div className="w-2 shrink-0" />}
                    <span className="text-sm font-medium">
                      {format(dateObj, "EEE d")}
                      {isToday && (
                        <span className="text-xs text-muted-foreground ml-1">(today)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-sm font-mono tabular-nums font-medium">
                      {formatCurrency(day.revenue)}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-muted-foreground w-10 text-right">
                      {day.transactions} tx
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && format(new Date(selectedDay.date), "EEEE, MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="space-y-4">
              {/* Skeleton summary cards */}
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="gap-0 p-4 py-4 shadow-none">
                    <Skeleton className="h-3 w-16 mb-2" />
                    <Skeleton className="h-7 w-20" />
                  </Card>
                ))}
              </div>
              {/* Skeleton sections */}
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            </div>
          ) : dayDetail ? (
            <div className="space-y-6">
              {/* Day Summary - SummaryCards */}
              <SummaryCardGrid className="grid-cols-3">
                <SummaryCard
                  label="Revenue"
                  value={formatCurrencyDecimal(dayDetail.summary.totalRevenue)}
                />
                <SummaryCard
                  label="Transactions"
                  value={String(dayDetail.summary.transactions)}
                />
                <SummaryCard
                  label="Avg Ticket"
                  value={formatCurrencyDecimal(dayDetail.summary.avgTicket)}
                />
              </SummaryCardGrid>

              {/* Daily Pulse */}
              {dayDetail.pulse && (
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Daily Pulse</CardTitle>
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
              <Card className="shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">By Daypart</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dayDetail.daypartBreakdown.map((dp) => (
                      <div key={dp.daypart} className="flex justify-between items-center">
                        <span className="text-sm">{dp.daypart}</span>
                        <div className="text-sm text-right">
                          <span className="font-medium font-mono tabular-nums">{formatCurrency(dp.revenue)}</span>
                          <span className="text-muted-foreground ml-2 font-mono tabular-nums">({dp.transactions} tx)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Products */}
              {dayDetail.topProducts.length > 0 && (
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dayDetail.topProducts.map((product, i) => (
                        <div key={product.name} className="flex justify-between items-center">
                          <span className="text-sm">
                            {i + 1}. {product.name}
                          </span>
                          <div className="text-sm text-right">
                            <span className="font-medium font-mono tabular-nums">{formatCurrency(product.revenue)}</span>
                            <span className="text-muted-foreground ml-2 font-mono tabular-nums">({product.quantity} sold)</span>
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
