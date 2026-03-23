"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { AlertBanner } from "@/components/ui/alert-banner"
import {
  Clock,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Flame,
  Trophy,
  UserX,
  History,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Employee {
  id: number
  firstName: string
  lastName: string
  position: string
  hourlyRate: number | string
  employmentStatus: string
}

interface ActiveShift {
  id: number
  clockIn: string
  clockOut: string | null
  shiftTemplate: { name: string; color: string } | null
  notes: string
}

interface MyShiftData {
  employee: Employee | null
  activeShift: ActiveShift | null
  isStaleShift: boolean
}

interface ShiftHistoryItem {
  id: number
  date: string
  clockIn: string
  clockOut: string | null
  breakMinutes: number
  shiftTemplate: { name: string; color: string } | null
}

interface ShiftSummary {
  shift: {
    id: number
    clockIn: string
    clockOut: string
    breakMinutes: number
    hoursWorked: number
  }
  summary: {
    tasksCompletedToday: number
    tasksTotal: number
    currentStreak: number
  }
}

interface Task {
  id: number
  name: string
  type: string
  icon: string
  deadlineTime: string
  required: boolean
  streakBreaking: boolean
  status: "pending" | "in_progress" | "completed" | "overdue"
  completedByName: string | null
}

interface StreakInfo {
  currentStreak: number
  longestStreak: number
  achievedMilestones: { days: number; badge: string; title: string }[]
  nextMilestone: { days: number; badge: string; title: string } | null
  daysToNextMilestone: number | null
}

interface DashboardData {
  tasks: Task[]
  taskSummary: { total: number; completed: number }
  streak: StreakInfo
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

type ShiftSection = "opening" | "service" | "closing"

function getTaskSection(deadlineTime: string): ShiftSection {
  const [hours] = deadlineTime.split(":").map(Number)
  if (hours < 11) return "opening"
  if (hours < 17) return "service"
  return "closing"
}

const SECTION_CONFIG: Record<ShiftSection, { label: string; bgColor: string; textColor: string }> = {
  opening: { label: "Opening", bgColor: "bg-status-warning/10", textColor: "text-status-warning" },
  service: { label: "Service", bgColor: "bg-status-info/10", textColor: "text-status-info" },
  closing: { label: "Closing", bgColor: "bg-accent", textColor: "text-accent-foreground" },
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function formatHours(clockIn: string, clockOut: string | null): string {
  if (!clockOut) return "—"
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime()
  const hours = ms / (1000 * 60 * 60)
  return `${hours.toFixed(1)}h`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function MyShiftPage() {
  const [shiftData, setShiftData] = useState<MyShiftData | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [taskActionLoading, setTaskActionLoading] = useState<number | null>(null)

  // Shift history state
  const [shiftHistory, setShiftHistory] = useState<ShiftHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyNextCursor, setHistoryNextCursor] = useState<number | null>(null)
  const [historyHasMore, setHistoryHasMore] = useState(false)

  // Stale shift dialog state
  const [staleDialogOpen, setStaleDialogOpen] = useState(false)
  const [staleClockOutTime, setStaleClockOutTime] = useState("")

  // Clock-out summary dialog state
  const [summaryData, setSummaryData] = useState<ShiftSummary | null>(null)
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false)

  // Elapsed timer
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Data fetching ──

  const fetchShiftData = useCallback(async () => {
    try {
      const res = await fetch("/api/my-shift")
      if (!res.ok) throw new Error("Failed to fetch")
      const data: MyShiftData = await res.json()
      setShiftData(data)
      return data
    } catch {
      toast.error("Failed to load shift data")
      return null
    }
  }, [])

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/employee")
      if (!res.ok) throw new Error("Failed to fetch")
      setDashboardData(await res.json())
    } catch {
      // Non-critical, silently fail
    }
  }, [])

  const fetchShiftHistory = useCallback(async (employeeId: number, cursor?: number | null) => {
    setHistoryLoading(true)
    try {
      const params = new URLSearchParams({ take: "10" })
      if (cursor) params.set("cursor", String(cursor))
      const res = await fetch(`/api/employees/${employeeId}/shifts?${params}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      if (cursor) {
        setShiftHistory((prev) => [...prev, ...data.shifts])
      } else {
        setShiftHistory(data.shifts)
      }
      setHistoryNextCursor(data.nextCursor)
      setHistoryHasMore(data.hasMore)
    } catch {
      toast.error("Failed to load shift history")
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    async function load() {
      const data = await fetchShiftData()
      if (data?.employee) {
        await Promise.all([
          fetchDashboardData(),
          fetchShiftHistory(data.employee.id),
        ])
      }
      setLoading(false)
    }
    load()
  }, [fetchShiftData, fetchDashboardData, fetchShiftHistory])

  // Timer for elapsed time
  useEffect(() => {
    if (shiftData?.activeShift && !shiftData.isStaleShift) {
      const clockIn = new Date(shiftData.activeShift.clockIn).getTime()
      const updateElapsed = () => setElapsed(Date.now() - clockIn)
      updateElapsed()
      timerRef.current = setInterval(updateElapsed, 1000)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    } else {
      setElapsed(0)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [shiftData?.activeShift, shiftData?.isStaleShift])

  // ── Actions ──

  async function handleClockIn() {
    setActionLoading(true)
    try {
      const res = await fetch("/api/my-shift/clock-in", { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to clock in")
      }
      toast.success("Clocked in!")
      await fetchShiftData()
      fetchDashboardData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clock in")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleClockOut() {
    setActionLoading(true)
    try {
      const res = await fetch("/api/my-shift/clock-out", { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to clock out")
      }
      const data: ShiftSummary = await res.json()
      setSummaryData(data)
      setSummaryDialogOpen(true)
      await fetchShiftData()
      if (shiftData?.employee) {
        fetchShiftHistory(shiftData.employee.id)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clock out")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCloseStale() {
    if (!staleClockOutTime) {
      toast.error("Please enter a clock-out time")
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch("/api/my-shift/close-stale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clockOutTime: new Date(staleClockOutTime).toISOString() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to close stale shift")
      }
      toast.success("Stale shift closed")
      setStaleDialogOpen(false)
      setStaleClockOutTime("")
      await fetchShiftData()
      if (shiftData?.employee) {
        fetchShiftHistory(shiftData.employee.id)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close stale shift")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleStartTask(taskId: number) {
    setTaskActionLoading(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}/start`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to start task")
      toast.success("Task started")
      fetchDashboardData()
    } catch {
      toast.error("Failed to start task")
    } finally {
      setTaskActionLoading(null)
    }
  }

  async function handleCompleteTask(taskId: number) {
    setTaskActionLoading(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to complete task")
      const result = await res.json()
      toast.success(result.wasOnTime ? "Task completed on time!" : "Task completed")
      fetchDashboardData()
    } catch {
      toast.error("Failed to complete task")
    } finally {
      setTaskActionLoading(null)
    }
  }

  // ── Loading state ──

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-10 w-40" />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        </div>
      </div>
    )
  }

  // ── Not linked ── (T019)

  if (!shiftData?.employee) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">My Shift</h1>
        </div>
        <EmptyState
          icon={<UserX className="size-12" />}
          title="Account not linked"
          description="Your account isn't linked to an employee record. Ask a manager to set this up."
        />
      </div>
    )
  }

  const employee = shiftData.employee
  const activeShift = shiftData.activeShift
  const isClockedIn = !!activeShift && !shiftData.isStaleShift

  // Group tasks by shift section
  const tasksBySection = dashboardData?.tasks
    ? (["opening", "service", "closing"] as ShiftSection[]).map((section) => ({
        section,
        config: SECTION_CONFIG[section],
        tasks: dashboardData.tasks.filter((t) => getTaskSection(t.deadlineTime) === section),
      }))
    : []

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3">
          <Clock className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">My Shift</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* ── Stale shift warning ── (T015) */}
      {shiftData.isStaleShift && activeShift && (
        <AlertBanner variant="warning" icon={<AlertTriangle className="size-5" />}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="font-medium">
              You have an unclosed shift from {formatDate(activeShift.clockIn)}.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="w-fit border-status-warning/30 text-status-warning hover:bg-status-warning/10"
              onClick={() => setStaleDialogOpen(true)}
            >
              Close Shift
            </Button>
          </div>
        </AlertBanner>
      )}

      {/* ── Clock-in/out hero ── (T014) */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">{employee.position}</p>
            </div>

            {isClockedIn ? (
              <>
                <div className="font-mono text-4xl sm:text-5xl tabular-nums font-bold tracking-tight">
                  {formatElapsed(elapsed)}
                </div>
                {activeShift.shiftTemplate && (
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: activeShift.shiftTemplate.color }}
                  >
                    {activeShift.shiftTemplate.name}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground">
                  Clocked in at {formatTime(activeShift.clockIn)}
                </p>
                <Button
                  size="lg"
                  variant="destructive"
                  className="mt-2 gap-2"
                  onClick={handleClockOut}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  Clock Out
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">
                  {shiftData.isStaleShift
                    ? "Close your previous shift to clock in"
                    : "Ready to start your shift"}
                </p>
                <Button
                  size="lg"
                  className="mt-2 gap-2"
                  onClick={handleClockIn}
                  disabled={actionLoading || shiftData.isStaleShift}
                >
                  {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                  Clock In
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Tasks & Streak row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Tasks ── (T016) */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="size-4 text-muted-foreground" />
              Today&apos;s Tasks
              {dashboardData?.taskSummary && (
                <Badge variant="secondary" className="ml-auto font-mono text-xs">
                  {dashboardData.taskSummary.completed}/{dashboardData.taskSummary.total}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!dashboardData ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : dashboardData.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No tasks scheduled today</p>
            ) : (
              tasksBySection.filter((s) => s.tasks.length > 0).map(({ section, config, tasks }) => (
                <div key={section} className="space-y-2">
                  <div className={cn("px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wider", config.bgColor, config.textColor)}>
                    {config.label}
                  </div>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border ml-2",
                        task.status === "completed" && "opacity-60"
                      )}
                    >
                      {task.status === "completed" ? (
                        <CheckCircle2 className="size-5 text-status-ok shrink-0" />
                      ) : task.status === "overdue" ? (
                        <AlertTriangle className="size-5 text-status-critical shrink-0" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium truncate", task.status === "completed" && "line-through")}>
                          {task.icon} {task.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Due by {task.deadlineTime}
                          {task.required && <span className="text-status-critical ml-1">*</span>}
                        </p>
                      </div>
                      {task.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartTask(task.id)}
                          disabled={taskActionLoading === task.id}
                        >
                          {taskActionLoading === task.id ? <Loader2 className="size-3 animate-spin" /> : "Start"}
                        </Button>
                      )}
                      {task.status === "in_progress" && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={taskActionLoading === task.id}
                        >
                          {taskActionLoading === task.id ? <Loader2 className="size-3 animate-spin" /> : "Done"}
                        </Button>
                      )}
                      {task.status === "overdue" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-status-critical/30 text-status-critical"
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={taskActionLoading === task.id}
                        >
                          {taskActionLoading === task.id ? <Loader2 className="size-3 animate-spin" /> : "Complete"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ── Streak & Milestones ── (T017) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Flame className="size-4 text-status-warning" />
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!dashboardData ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="text-center">
                  <p className="text-4xl font-bold font-mono tabular-nums">
                    {dashboardData.streak.currentStreak}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">day streak</p>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Longest: {dashboardData.streak.longestStreak} days</span>
                </div>

                {/* Next milestone progress */}
                {dashboardData.streak.nextMilestone && dashboardData.streak.daysToNextMilestone != null && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {dashboardData.streak.nextMilestone.badge} {dashboardData.streak.nextMilestone.title}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {dashboardData.streak.daysToNextMilestone}d left
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-status-warning rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (dashboardData.streak.currentStreak / dashboardData.streak.nextMilestone.days) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Achieved milestones */}
                {dashboardData.streak.achievedMilestones.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Milestones</p>
                    <div className="flex flex-wrap gap-1.5">
                      {dashboardData.streak.achievedMilestones.map((m) => (
                        <Badge key={m.days} variant="secondary" className="text-xs">
                          {m.badge} {m.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Shift History ── (T018) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            Shift History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shiftHistory.length === 0 && !historyLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No shift history yet</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 font-medium">Date</th>
                      <th className="text-left py-2 font-medium">Clock In</th>
                      <th className="text-left py-2 font-medium">Clock Out</th>
                      <th className="text-right py-2 font-medium">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftHistory.map((shift) => (
                      <tr key={shift.id} className="border-b last:border-0">
                        <td className="py-2.5">{formatDate(shift.date)}</td>
                        <td className="py-2.5 font-mono text-xs">{formatTime(shift.clockIn)}</td>
                        <td className="py-2.5 font-mono text-xs">
                          {shift.clockOut ? formatTime(shift.clockOut) : (
                            <Badge variant="outline" className="text-xs text-status-warning">Active</Badge>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono text-xs tabular-nums">
                          {formatHours(shift.clockIn, shift.clockOut)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {shiftHistory.map((shift) => (
                  <div key={shift.id} className="flex justify-between items-center p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{formatDate(shift.date)}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatTime(shift.clockIn)} – {shift.clockOut ? formatTime(shift.clockOut) : "Active"}
                      </p>
                    </div>
                    <span className="font-mono text-sm tabular-nums font-medium">
                      {formatHours(shift.clockIn, shift.clockOut)}
                    </span>
                  </div>
                ))}
              </div>

              {historyHasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (shiftData?.employee && historyNextCursor) {
                        fetchShiftHistory(shiftData.employee.id, historyNextCursor)
                      }
                    }}
                    disabled={historyLoading}
                  >
                    {historyLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Stale Shift Dialog ── (T015) */}
      <Dialog open={staleDialogOpen} onOpenChange={setStaleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Unclosed Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              You have a shift from{" "}
              <span className="font-medium text-foreground">
                {activeShift ? formatDate(activeShift.clockIn) : ""}
              </span>{" "}
              that was never closed. Enter the actual time you left.
            </p>
            <div className="space-y-2">
              <Label htmlFor="stale-clock-out">Clock-out time</Label>
              <Input
                id="stale-clock-out"
                type="datetime-local"
                value={staleClockOutTime}
                onChange={(e) => setStaleClockOutTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloseStale} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Close Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Clock-Out Summary Dialog ── (T024) */}
      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-status-warning" />
              Shift Complete
            </DialogTitle>
          </DialogHeader>
          {summaryData && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums">
                    {summaryData.shift.hoursWorked.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Hours</p>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums">
                    {summaryData.summary.tasksCompletedToday}/{summaryData.summary.tasksTotal}
                  </p>
                  <p className="text-xs text-muted-foreground">Tasks</p>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums">
                    {summaryData.summary.currentStreak}
                  </p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSummaryDialogOpen(false)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
