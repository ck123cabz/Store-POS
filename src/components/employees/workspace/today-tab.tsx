"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Circle,
  Loader2,
  CircleCheck,
  AlertTriangle,
  Clock,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { StatusDot } from "@/components/ui/status-dot"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { StatCard } from "./shared/stat-card"
import { StaleShiftAlert } from "./shared/stale-shift-alert"
import { useWorkspacePolling } from "@/hooks/use-workspace-polling"
import { EmptyState } from "@/components/ui/empty-state"

interface ClockedInEmployee {
  id: number
  employeeId: number
  employee: {
    id: number
    firstName: string
    lastName: string
    position: string
  }
  clockIn: string
  shiftTemplate?: { name: string; color: string } | null
}

interface StatsData {
  activeCount: number
  clockedIn: ClockedInEmployee[]
  todayShifts: {
    id: number
    employee: { firstName: string; lastName: string }
    shiftTemplate?: { name: string; color: string } | null
  }[]
  pendingPayments: number
  hoursThisPeriod: number
  payrollDue: number
}

interface TodayTask {
  id: number
  name: string
  type: string
  deadlineTime: string
  assignedToId: number | null
  assignedToName: string | null
  status: "pending" | "in_progress" | "completed" | "overdue"
  completedByName: string | null
}

interface TasksData {
  tasks: TodayTask[]
  summary: {
    total: number
    completed: number
    inProgress: number
    pending: number
    overdue: number
  }
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function isStaleShift(clockIn: string): boolean {
  const clockInDate = new Date(clockIn)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return clockInDate < today
}

const statusIcons = {
  pending: <Circle className="size-4 text-muted-foreground" />,
  in_progress: <Loader2 className="size-4 text-status-info animate-spin" />,
  completed: <CircleCheck className="size-4 text-status-ok" />,
  overdue: <AlertTriangle className="size-4 text-status-warning" />,
}

export default function TodayTab() {
  const router = useRouter()
  const { data: stats, loading: statsLoading } = useWorkspacePolling<StatsData>({
    url: "/api/employees/stats",
  })
  const { data: tasksData, loading: tasksLoading } = useWorkspacePolling<TasksData>({
    url: "/api/tasks/today",
  })

  // Resolve stale shift dialog
  const [resolveShift, setResolveShift] = useState<ClockedInEmployee | null>(null)
  const [clockOutTime, setClockOutTime] = useState("")
  const [resolving, setResolving] = useState(false)

  const handleResolve = useCallback(async () => {
    if (!resolveShift || !clockOutTime) return
    setResolving(true)
    try {
      const clockInDate = new Date(resolveShift.clockIn)
      const [hours, minutes] = clockOutTime.split(":").map(Number)
      const clockOutDate = new Date(clockInDate)
      clockOutDate.setHours(hours, minutes, 0, 0)

      const res = await fetch(`/api/employees/${resolveShift.employeeId}/clock-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clockOutTime: clockOutDate.toISOString() }),
      })
      if (!res.ok) throw new Error("Failed to clock out")
      toast.success("Shift resolved")
      setResolveShift(null)
      setClockOutTime("")
    } catch {
      toast.error("Failed to resolve shift")
    } finally {
      setResolving(false)
    }
  }, [resolveShift, clockOutTime])

  const clockedIn = stats?.clockedIn || []
  const staleShifts = clockedIn.filter((s) => isStaleShift(s.clockIn))
  const activeShifts = clockedIn.filter((s) => !isStaleShift(s.clockIn))
  const tasks = tasksData?.tasks || []
  const summary = tasksData?.summary

  // Group tasks by status
  const pendingTasks = tasks.filter((t) => t.status === "pending" || t.status === "overdue")
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress")
  const completedTasks = tasks.filter((t) => t.status === "completed")

  // Unique shift templates from today's shifts for the bottom bar
  const todayShifts = stats?.todayShifts || []
  const templateMap = new Map<string, { name: string; color: string; count: number }>()
  for (const shift of todayShifts) {
    const tmpl = shift.shiftTemplate
    if (tmpl) {
      const key = tmpl.name
      const existing = templateMap.get(key)
      if (existing) {
        existing.count++
      } else {
        templateMap.set(key, { name: tmpl.name, color: tmpl.color, count: 1 })
      }
    }
  }
  const shiftTemplates = Array.from(templateMap.values())

  return (
    <div className="space-y-6">
      {/* Stale Shift Alerts */}
      {staleShifts.length > 0 && (
        <div className="space-y-2">
          {staleShifts.map((shift) => (
            <StaleShiftAlert
              key={shift.id}
              employeeName={`${shift.employee.firstName} ${shift.employee.lastName}`}
              clockInTime={formatTime(shift.clockIn)}
              onResolve={() => {
                setResolveShift(shift)
                setClockOutTime("")
              }}
            />
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Clocked In"
          value={statsLoading ? "\u2026" : activeShifts.length.toString()}
          icon={<StatusDot variant="ok" pulse />}
        />
        <StatCard
          label="Hours Today"
          value={statsLoading ? "\u2026" : `${(stats?.hoursThisPeriod ?? 0).toFixed(1)}`}
        />
        <StatCard
          label="Tasks Done"
          value={
            tasksLoading
              ? "\u2026"
              : `${summary?.completed ?? 0}/${summary?.total ?? 0}`
          }
        />
        <StatCard
          label="Alerts"
          value={statsLoading ? "\u2026" : staleShifts.length.toString()}
          borderColor={staleShifts.length > 0 ? "var(--status-warning)" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clocked In Panel */}
        <Card className="p-0 shadow-none">
          <div className="flex items-center gap-2 p-4 border-b border-border/60">
            <StatusDot variant="ok" pulse />
            <h2 className="font-semibold text-sm">Currently Clocked In</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {activeShifts.length} active
            </span>
          </div>
          <div className="divide-y divide-border/60">
            {activeShifts.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No employees clocked in
              </div>
            ) : (
              activeShifts.map((shift) => (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() =>
                    router.push(`/employees?tab=team&id=${shift.employeeId}`)
                  }
                  className="flex items-center gap-3 p-3 px-4 w-full text-left hover:bg-muted/40 transition-colors"
                >
                  <Avatar size="sm">
                    <AvatarFallback>
                      {getInitials(shift.employee.firstName, shift.employee.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm truncate">
                      {shift.employee.firstName} {shift.employee.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {shift.employee.position}
                      {shift.shiftTemplate && ` \u00B7 ${shift.shiftTemplate.name}`}
                    </span>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap">
                    In at {formatTime(shift.clockIn)}
                  </span>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Task Board */}
        <Card className="p-0 shadow-none">
          <div className="flex items-center gap-2 p-4 border-b border-border/60">
            <h2 className="font-semibold text-sm">Today&apos;s Tasks</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {summary ? `${summary.completed}/${summary.total} done` : ""}
            </span>
          </div>
          {tasks.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<CircleCheck className="h-8 w-8" />}
                title="No tasks today"
                description="Create tasks in the Tasks tab to see them here."
              />
            </div>
          ) : (
            <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
              {[...pendingTasks, ...inProgressTasks, ...completedTasks].map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 px-4">
                  {statusIcons[task.status]}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">{task.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {task.assignedToName || "Anyone"} &middot;{" "}
                      <span className="font-mono tabular-nums">{task.deadlineTime}</span>
                    </span>
                  </div>
                  <Badge
                    className={
                      task.status === "completed"
                        ? "border-transparent bg-status-ok/15 text-status-ok"
                        : task.status === "in_progress"
                          ? "border-transparent bg-status-info/15 text-status-info"
                          : task.status === "overdue"
                            ? "border-transparent bg-status-warning/15 text-status-warning"
                            : "border-transparent bg-muted text-muted-foreground"
                    }
                  >
                    {task.status === "in_progress" ? "In Progress" : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Today's Shifts Bar */}
      {shiftTemplates.length > 0 && (
        <Card className="p-0 shadow-none">
          <div className="flex items-center gap-2 p-4 border-b border-border/60">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Shift Templates Today</h2>
          </div>
          <div className="flex flex-wrap gap-4 p-4">
            {shiftTemplates.map((tmpl) => (
              <div key={tmpl.name} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tmpl.color }}
                />
                <span className="text-sm font-medium">{tmpl.name}</span>
                <span className="text-xs text-muted-foreground">
                  {tmpl.count} assigned
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Resolve Stale Shift Dialog */}
      <Dialog open={!!resolveShift} onOpenChange={() => setResolveShift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Stale Shift</DialogTitle>
          </DialogHeader>
          {resolveShift && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set the clock-out time for{" "}
                <strong>
                  {resolveShift.employee.firstName} {resolveShift.employee.lastName}
                </strong>
                &apos;s shift that started at {formatTime(resolveShift.clockIn)}.
              </p>
              <div className="space-y-2">
                <Label htmlFor="clockOutTime">Clock Out Time</Label>
                <Input
                  id="clockOutTime"
                  type="time"
                  value={clockOutTime}
                  onChange={(e) => setClockOutTime(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setResolveShift(null)}>
                  Cancel
                </Button>
                <Button onClick={handleResolve} disabled={!clockOutTime || resolving}>
                  {resolving ? "Resolving..." : "Set Clock Out"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
