"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { EmptyState } from "@/components/ui/empty-state"
import { formatCurrency } from "@/lib/format-currency"
import { useSettings } from "@/hooks/use-settings"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReportsData {
  hoursByEmployee: { employeeId: number; name: string; position: string; hours: number }[]
  laborCostByPosition: { position: string; totalCost: number; percentage: number }[]
  taskCompletionRates: { employeeId: number; name: string; completed: number; total: number; rate: number }[]
  streakLeaderboard: { userId: number; name: string; currentStreak: number; longestStreak: number }[]
  paymentSummary: { totalPaid: number; totalPending: number; totalAmount: number }
  attendancePatterns: { templateId: number; templateName: string; avgClockInMinutes: number; lateCount: number }[]
  teamAvgHours: number
}

const dateRangePresets = [
  {
    label: "Last 14 days",
    getValue: () => {
      const to = new Date(); const from = new Date()
      from.setDate(from.getDate() - 14); from.setHours(0, 0, 0, 0)
      return { from, to }
    },
  },
  {
    label: "This Month",
    getValue: () => {
      const to = new Date()
      const from = new Date(to.getFullYear(), to.getMonth(), 1)
      return { from, to }
    },
  },
  {
    label: "This Quarter",
    getValue: () => {
      const to = new Date()
      const qMonth = Math.floor(to.getMonth() / 3) * 3
      const from = new Date(to.getFullYear(), qMonth, 1)
      return { from, to }
    },
  },
]

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`
}

export default function ReportsTab() {
  const { currencySymbol } = useSettings()
  const fmtCurrency = (v: string | number | null | undefined) => formatCurrency(v, currencySymbol)

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 14)
    from.setHours(0, 0, 0, 0)
    return { from, to }
  })

  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const from = dateRange.from.toISOString().split("T")[0]
      const to = dateRange.to.toISOString().split("T")[0]
      const res = await fetch(`/api/employees/reports?from=${from}&to=${to}`)
      if (res.ok) setData(await res.json())
    } catch {
      /* non-critical */
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading reports...</p>
  }

  if (!data) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-8 w-8" />}
        title="No report data"
        description="Unable to load reports for the selected period."
      />
    )
  }

  return (
    <div className="space-y-6">
      <DateRangePicker
        from={dateRange.from}
        to={dateRange.to}
        onChange={(range) => {
          if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to })
        }}
        presets={dateRangePresets}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Hours by Employee */}
        <Card className="p-0 shadow-none">
          <div className="p-4 border-b border-border/60">
            <h3 className="font-semibold text-sm">Hours by Employee</h3>
          </div>
          <div className="p-4 space-y-2">
            {data.hoursByEmployee.length === 0 ? (
              <p className="text-xs text-muted-foreground">No shift data</p>
            ) : (
              <>
                {data.hoursByEmployee
                  .sort((a, b) => b.hours - a.hours)
                  .map((e, i) => (
                    <div key={e.employeeId} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block">{e.name}</span>
                        <span className="text-xs text-muted-foreground">{e.position}</span>
                      </div>
                      <span className="font-mono tabular-nums text-sm font-medium">{e.hours.toFixed(1)}h</span>
                    </div>
                  ))}
                <p className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                  Team Avg: <span className="font-mono tabular-nums">{data.teamAvgHours.toFixed(1)}h</span>
                </p>
              </>
            )}
          </div>
        </Card>

        {/* Labor Cost Breakdown */}
        <Card className="p-0 shadow-none">
          <div className="p-4 border-b border-border/60">
            <h3 className="font-semibold text-sm">Labor Cost Breakdown</h3>
          </div>
          <div className="p-4 space-y-3">
            {data.laborCostByPosition.length === 0 ? (
              <p className="text-xs text-muted-foreground">No cost data</p>
            ) : (
              data.laborCostByPosition
                .sort((a, b) => b.totalCost - a.totalCost)
                .map((p) => (
                  <div key={p.position} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{p.position || "Unassigned"}</span>
                      <span className="font-mono tabular-nums">{fmtCurrency(p.totalCost)} ({p.percentage}%)</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground/60 rounded-full"
                        style={{ width: `${p.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
            )}
          </div>
        </Card>

        {/* Task Completion Rates */}
        <Card className="p-0 shadow-none">
          <div className="p-4 border-b border-border/60">
            <h3 className="font-semibold text-sm">Task Completion Rates</h3>
          </div>
          <div className="p-4 space-y-2">
            {data.taskCompletionRates.length === 0 ? (
              <p className="text-xs text-muted-foreground">No task data</p>
            ) : (
              data.taskCompletionRates
                .sort((a, b) => b.rate - a.rate)
                .map((e) => (
                  <div key={e.employeeId} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block">{e.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {e.completed}/{e.total} tasks
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-mono tabular-nums text-sm font-medium",
                        e.rate >= 90 ? "text-status-ok" : e.rate >= 70 ? "text-status-warning" : "text-status-critical"
                      )}
                    >
                      {e.rate.toFixed(0)}%
                    </span>
                  </div>
                ))
            )}
          </div>
        </Card>

        {/* Streak Leaderboard */}
        <Card className="p-0 shadow-none">
          <div className="p-4 border-b border-border/60">
            <h3 className="font-semibold text-sm">Streak Leaderboard</h3>
          </div>
          <div className="p-4 space-y-2">
            {data.streakLeaderboard.length === 0 ? (
              <p className="text-xs text-muted-foreground">No streak data</p>
            ) : (
              data.streakLeaderboard.map((s, i) => (
                <div key={s.userId} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate block">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Best: {s.longestStreak}d
                    </span>
                  </div>
                  <span className="font-mono tabular-nums text-sm font-medium text-status-warning">
                    {s.currentStreak}d
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Payment Summary */}
        <Card className="p-0 shadow-none">
          <div className="p-4 border-b border-border/60">
            <h3 className="font-semibold text-sm">Payment Summary</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-status-ok">Paid</span>
              <span className="font-mono tabular-nums font-medium">{fmtCurrency(data.paymentSummary.totalPaid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-status-warning">Pending</span>
              <span className="font-mono tabular-nums font-medium">{fmtCurrency(data.paymentSummary.totalPending)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border/40 pt-3">
              <span className="font-medium">Total</span>
              <span className="font-mono tabular-nums font-medium">{fmtCurrency(data.paymentSummary.totalAmount)}</span>
            </div>
          </div>
        </Card>

        {/* Attendance Patterns */}
        <Card className="p-0 shadow-none">
          <div className="p-4 border-b border-border/60">
            <h3 className="font-semibold text-sm">Attendance Patterns</h3>
          </div>
          <div className="p-4 space-y-2">
            {data.attendancePatterns.length === 0 ? (
              <p className="text-xs text-muted-foreground">No attendance data</p>
            ) : (
              data.attendancePatterns.map((a) => (
                <div key={a.templateId} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate block">{a.templateName}</span>
                    <span className="text-xs text-muted-foreground">
                      Avg clock-in: <span className="font-mono tabular-nums">{minutesToTime(a.avgClockInMinutes)}</span>
                    </span>
                  </div>
                  {a.lateCount > 0 && (
                    <span className="text-xs text-status-warning font-medium">
                      {a.lateCount} late
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
