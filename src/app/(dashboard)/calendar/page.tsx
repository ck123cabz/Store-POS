"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { format, addMonths, subMonths, isFuture } from "date-fns"
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
import { getVibeColorClasses, getVibeLabel, type VibeLevel } from "@/lib/vibe-colors"
import { cn } from "@/lib/utils"

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

// T087: Cache type for vibe data per month
type MonthCacheKey = string // "year-month" format
type MonthCache = Map<MonthCacheKey, CalendarData>

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

  function formatCurrency(value: number): string {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Get first day offset for calendar grid
  const firstDayOffset = data?.days[0]?.dayOfWeek || 0

  // Find max revenue for color scaling
  const maxRevenue = data?.days.reduce((max, d) => Math.max(max, d.revenue), 0) || 1

  function getRevenueIntensity(revenue: number): string {
    if (revenue === 0) return "bg-muted/50"
    const intensity = Math.min(revenue / maxRevenue, 1)
    if (intensity > 0.75) return "bg-green-200"
    if (intensity > 0.5) return "bg-green-100"
    if (intensity > 0.25) return "bg-green-50"
    return "bg-muted"
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Sales Calendar
          </h1>
          <p className="text-muted-foreground text-sm">Month overview with daily performance</p>
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
          <Button variant="outline" size="icon" onClick={() => fetchCalendar(true)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Month Summary */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-xl md:text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-xl md:text-2xl font-bold">{data.summary.totalTransactions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Avg Daily</p>
              <p className="text-xl md:text-2xl font-bold">{formatCurrency(data.summary.avgDailyRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Avg Ticket</p>
              <p className="text-xl md:text-2xl font-bold">{formatCurrency(data.summary.avgTicket)}</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Days Active</p>
              <p className="text-xl md:text-2xl font-bold">{data.summary.daysWithSales}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar Grid */}
      {data && (
        <Card>
          <CardHeader className="pb-2">
            {/* T088: Year boundary display with year labels (EC-21) */}
            <CardTitle className="text-center">
              {data.monthName}
              {data.year !== new Date().getFullYear() && (
                <span className="ml-2 text-muted-foreground font-normal text-base">
                  {data.year}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center text-xs md:text-sm font-medium text-muted-foreground py-2">
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
                const dateObj = new Date(day.date)
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
                  day.transactions > 0 ? `${formatCurrency(day.revenue)} revenue, ${day.transactions} transactions` : "No sales",
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
                          : getRevenueIntensity(day.revenue), // Fallback to revenue-based
                      isToday && "ring-2 ring-primary",
                      // T091: Adjacent month days muted (EC-24) - handled by empty cells
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
                            "text-[10px] truncate hidden sm:block",
                            day.vibe && !isFutureDate ? vibeClasses.text : "text-muted-foreground"
                          )}>
                            {formatCurrency(day.revenue)}
                          </span>
                          <span className={cn(
                            "text-[10px] hidden sm:block",
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

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-muted border" /> No sales
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
                    <p className="text-xl md:text-2xl font-bold">{formatCurrency(dayDetail.summary.totalRevenue)}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground" />
                    <p className="text-xl md:text-2xl font-bold">{dayDetail.summary.transactions}</p>
                    <p className="text-xs text-muted-foreground">Transactions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-center">
                    <DollarSign className="h-5 w-5 mx-auto text-muted-foreground" />
                    <p className="text-xl md:text-2xl font-bold">{formatCurrency(dayDetail.summary.avgTicket)}</p>
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
