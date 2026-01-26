"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Trophy,
  Flame,
  Users,
  LayoutGrid,
  List,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Task {
  id: number
  name: string
  type: string
  icon: string
  deadlineTime: string
  required: boolean
  streakBreaking: boolean
  assignedToName: string | null
  status: "pending" | "in_progress" | "completed" | "overdue"
  completedByName: string | null
  completedAt: string | null
  wasOnTime: boolean | null
}

// T055: Section types for shift grouping
type ShiftSection = "opening" | "service" | "closing"

// T055: Section configuration with colors
const SECTION_CONFIG: Record<ShiftSection, { label: string; bgColor: string; textColor: string }> = {
  opening: { label: "Opening", bgColor: "bg-amber-50", textColor: "text-amber-800" },
  service: { label: "Service", bgColor: "bg-blue-50", textColor: "text-blue-800" },
  closing: { label: "Closing", bgColor: "bg-purple-50", textColor: "text-purple-800" },
}

// T055: Determine section based on deadline time
function getTaskSection(deadlineTime: string): ShiftSection {
  const [hours] = deadlineTime.split(":").map(Number)
  if (hours < 11) return "opening"
  if (hours < 17) return "service"
  return "closing"
}

// T059: Milestone thresholds for streak progress
const STREAK_MILESTONES = [7, 14, 30, 60, 90]

interface TaskSummary {
  total: number
  completed: number
  inProgress: number
  pending: number
  overdue: number
}

interface Milestone {
  days: number
  badge: string
  title: string
}

interface StreakInfo {
  currentStreak: number
  longestStreak: number
  lastCompletedDate: string | null
  achievedMilestones: Milestone[]
  nextMilestone: Milestone | null
  daysToNextMilestone: number | null
}

interface LeaderboardEntry {
  rank: number
  userId: number
  fullname: string
  currentStreak: number
  isCurrentUser: boolean
}

interface Alert {
  type: "warning" | "info"
  icon: string
  message: string
}

interface DashboardData {
  date: string
  currentTime: string
  user: { id: number; name: string }
  tasks: Task[]
  taskSummary: TaskSummary
  streak: StreakInfo
  leaderboard: LeaderboardEntry[]
  alerts: Alert[]
}

type ViewMode = "timeline" | "andon"

export default function EmployeeDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("timeline")
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/employee")
      if (!res.ok) throw new Error("Failed to fetch")
      setData(await res.json())
    } catch {
      toast.error("Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
    // Refresh every minute
    const interval = setInterval(fetchDashboard, 60000)
    return () => clearInterval(interval)
  }, [fetchDashboard])

  async function handleStartTask(taskId: number) {
    setActionLoading(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}/start`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to start task")
      toast.success("Task started")
      fetchDashboard()
    } catch {
      toast.error("Failed to start task")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCompleteTask(taskId: number) {
    setActionLoading(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to complete task")
      const result = await res.json()
      if (result.wasOnTime) {
        toast.success("Task completed on time! 🎉")
      } else {
        toast.success("Task completed")
      }
      fetchDashboard()
    } catch {
      toast.error("Failed to complete task")
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Failed to load dashboard</div>
      </div>
    )
  }

  const progressPercent = data.taskSummary.total > 0
    ? Math.round((data.taskSummary.completed / data.taskSummary.total) * 100)
    : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Employee Dashboard</h1>
          <p className="text-muted-foreground">
            {new Date(data.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "timeline" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("timeline")}
          >
            <List className="h-4 w-4 mr-1" /> Timeline
          </Button>
          <Button
            variant={viewMode === "andon" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("andon")}
          >
            <LayoutGrid className="h-4 w-4 mr-1" /> Andon
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {data.alerts.map((alert, i) => (
            <Badge
              key={i}
              variant={alert.type === "warning" ? "destructive" : "secondary"}
              className="text-sm py-1"
            >
              {alert.icon} {alert.message}
            </Badge>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{progressPercent}%</div>
            <div className="text-sm text-muted-foreground">
              {data.taskSummary.completed} of {data.taskSummary.total} tasks
            </div>
            <div className="mt-2 h-2 bg-accent rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* T058, T059, T061: Enhanced Streak with milestone progress bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-500" /> Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* T058: Enhanced streak counter display */}
            <div className="text-2xl font-bold flex items-baseline gap-1">
              {data.streak.currentStreak}
              <span className="text-base font-normal text-muted-foreground">days</span>
            </div>
            {/* T061: Streak = 0 message (EC-13) */}
            {data.streak.currentStreak === 0 ? (
              <div className="text-sm text-muted-foreground mt-1">
                Start your streak today!
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Best: {data.streak.longestStreak} days
              </div>
            )}
            {/* T059: Streak milestone progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                {data.streak.nextMilestone && (
                  <span>{data.streak.daysToNextMilestone} to {data.streak.nextMilestone.badge}</span>
                )}
              </div>
              <div className="relative h-2 bg-accent rounded-full overflow-hidden">
                {/* Milestone markers */}
                {STREAK_MILESTONES.map((milestone) => {
                  const position = Math.min((milestone / STREAK_MILESTONES[STREAK_MILESTONES.length - 1]) * 100, 100)
                  const achieved = data.streak.currentStreak >= milestone
                  return (
                    <div
                      key={milestone}
                      className={cn(
                        "absolute top-0 w-0.5 h-full",
                        achieved ? "bg-orange-600" : "bg-muted-foreground/30"
                      )}
                      style={{ left: `${position}%` }}
                      title={`${milestone} days`}
                    />
                  )
                })}
                {/* Progress fill */}
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
                  style={{
                    width: `${Math.min((data.streak.currentStreak / STREAK_MILESTONES[STREAK_MILESTONES.length - 1]) * 100, 100)}%`
                  }}
                />
              </div>
              {/* Milestone labels */}
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                {[7, 30, 90].map((milestone) => (
                  <span key={milestone} className={cn(
                    data.streak.currentStreak >= milestone && "text-orange-600 font-medium"
                  )}>
                    {milestone}d
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Trophy className="h-4 w-4 text-yellow-500" /> Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 flex-wrap">
              {data.streak.achievedMilestones.length > 0 ? (
                data.streak.achievedMilestones.map((m) => (
                  <span key={m.days} title={m.title} className="text-2xl">
                    {m.badge}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None yet</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" /> Team Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.leaderboard.slice(0, 3).map((entry) => (
              <div
                key={entry.userId}
                className={cn(
                  "flex justify-between text-sm",
                  entry.isCurrentUser && "font-medium"
                )}
              >
                <span>
                  {entry.rank}. {entry.fullname}
                  {entry.isCurrentUser && " (You)"}
                </span>
                <span>{entry.currentStreak}🔥</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Task List / Andon Board */}
      {viewMode === "timeline" ? (
        <TimelineView
          tasks={data.tasks}
          actionLoading={actionLoading}
          onStart={handleStartTask}
          onComplete={handleCompleteTask}
        />
      ) : (
        <AndonView tasks={data.tasks} />
      )}
    </div>
  )
}

function TimelineView({
  tasks,
  actionLoading,
  onStart,
  onComplete,
}: {
  tasks: Task[]
  actionLoading: number | null
  onStart: (id: number) => void
  onComplete: (id: number) => void
}) {
  // T055: Group tasks by shift section
  const groupedTasks = tasks.reduce((acc, task) => {
    const section = getTaskSection(task.deadlineTime)
    if (!acc[section]) acc[section] = []
    acc[section].push(task)
    return acc
  }, {} as Record<ShiftSection, Task[]>)

  // T064: Check if all tasks in a section are completed (EC-16)
  const isSectionComplete = (sectionTasks: Task[] | undefined) => {
    return sectionTasks && sectionTasks.length > 0 && sectionTasks.every(t => t.status === "completed")
  }

  const sectionOrder: ShiftSection[] = ["opening", "service", "closing"]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* T060: No tasks empty state (EC-12) */}
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <Circle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No tasks for today</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Enjoy your day off!</p>
          </div>
        ) : (
          sectionOrder.map((section) => {
            const sectionTasks = groupedTasks[section]
            if (!sectionTasks || sectionTasks.length === 0) return null

            const config = SECTION_CONFIG[section]
            const allComplete = isSectionComplete(sectionTasks)

            return (
              <div key={section} className="space-y-2">
                {/* T055, T065: Section header with background and semantic h3 */}
                <div className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg",
                  config.bgColor
                )}>
                  <h3 className={cn("font-semibold", config.textColor)}>
                    {config.label}
                  </h3>
                  {/* T064: All section tasks done checkmark (EC-16) */}
                  {allComplete && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">Complete</span>
                    </div>
                  )}
                </div>

                {/* T056: Tasks with connector lines */}
                <div className="relative pl-4">
                  {/* T056: Vertical connector line */}
                  {sectionTasks.length > 1 && (
                    <div
                      className="absolute left-7 top-6 bottom-6 w-0.5 bg-muted-foreground/30"
                      aria-hidden="true"
                    />
                  )}

                  <div className="space-y-2">
                    {sectionTasks.map((task, index) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isFirst={index === 0}
                        isLast={index === sectionTasks.length - 1}
                        actionLoading={actionLoading}
                        onStart={onStart}
                        onComplete={onComplete}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

// T057, T063, T066: Individual task card with status coloring and accessibility
function TaskCard({
  task,
  isFirst,
  isLast,
  actionLoading,
  onStart,
  onComplete,
}: {
  task: Task
  isFirst: boolean
  isLast: boolean
  actionLoading: number | null
  onStart: (id: number) => void
  onComplete: (id: number) => void
}) {
  // T063: Handle overdue AND completed (EC-15) - completed late
  const isCompletedLate = task.status === "completed" && !task.wasOnTime

  // T066: Build aria-label describing task status (NFR-A09)
  const getAriaLabel = () => {
    let label = `${task.name}, due by ${task.deadlineTime}`
    if (task.status === "completed") {
      label += isCompletedLate ? ", completed late" : ", completed on time"
    } else if (task.status === "overdue") {
      label += ", overdue"
    } else if (task.status === "in_progress") {
      label += ", in progress"
    } else {
      label += ", pending"
    }
    if (task.required) label += ", required task"
    if (task.streakBreaking) label += ", streak breaking"
    return label
  }

  return (
    <div
      role="listitem"
      aria-label={getAriaLabel()}
      className={cn(
        "relative flex items-center gap-4 p-3 rounded-lg border transition-colors",
        // T057: Color-code by status
        task.status === "completed" && "bg-green-50 border-green-200",
        task.status === "overdue" && !isCompletedLate && "bg-red-50 border-red-200",
        task.status === "in_progress" && "bg-blue-50 border-blue-200",
        task.status === "pending" && "bg-background border-border"
      )}
    >
      {/* T056: Connector dot */}
      <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-muted-foreground/50 z-10" />

      {/* Status Icon */}
      <div className="flex-shrink-0">
        {task.status === "completed" ? (
          <CheckCircle2 className={cn("h-6 w-6", isCompletedLate ? "text-amber-600" : "text-green-600")} />
        ) : task.status === "overdue" ? (
          <AlertTriangle className="h-6 w-6 text-red-600" />
        ) : task.status === "in_progress" ? (
          <Clock className="h-6 w-6 text-blue-600" />
        ) : (
          <Circle className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* Task Icon */}
      <span className="text-2xl flex-shrink-0">{task.icon}</span>

      {/* Task Info */}
      <div className="flex-grow min-w-0">
        <div className={cn(
          "font-medium flex items-center gap-2",
          // T063: Strikethrough for completed late (EC-15)
          isCompletedLate && "line-through text-muted-foreground"
        )}>
          {task.name}
          {task.required && (
            <Badge variant="outline" className="text-xs">Required</Badge>
          )}
          {task.streakBreaking && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
              🔥 Streak
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          Due by {task.deadlineTime}
          {task.completedByName && (
            <span> · Completed by {task.completedByName}</span>
          )}
          {/* T063: "completed late" label (EC-15) */}
          {isCompletedLate && (
            <span className="text-amber-600"> · completed late</span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex-shrink-0">
        {task.status === "pending" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStart(task.id)}
            disabled={actionLoading === task.id}
          >
            Start
          </Button>
        )}
        {task.status === "in_progress" && (
          <Button
            size="sm"
            onClick={() => onComplete(task.id)}
            disabled={actionLoading === task.id}
          >
            Complete
          </Button>
        )}
        {task.status === "overdue" && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onComplete(task.id)}
            disabled={actionLoading === task.id}
          >
            Complete
          </Button>
        )}
        {task.status === "completed" && (
          <Badge variant="secondary" className={cn(
            isCompletedLate ? "text-amber-700" : "text-green-700"
          )}>
            {task.wasOnTime ? "On Time ✓" : "Late"}
          </Badge>
        )}
      </div>
    </div>
  )
}

function AndonView({ tasks }: { tasks: Task[] }) {
  const grouped = {
    completed: tasks.filter((t) => t.status === "completed"),
    inProgress: tasks.filter((t) => t.status === "in_progress"),
    pending: tasks.filter((t) => t.status === "pending"),
    overdue: tasks.filter((t) => t.status === "overdue"),
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Completed */}
      <Card className="border-green-200">
        <CardHeader className="bg-green-50 rounded-t-lg">
          <CardTitle className="text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Completed ({grouped.completed.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {grouped.completed.map((t) => (
            <AndonCard key={t.id} task={t} />
          ))}
        </CardContent>
      </Card>

      {/* In Progress */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50 rounded-t-lg">
          <CardTitle className="text-blue-700 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            In Progress ({grouped.inProgress.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {grouped.inProgress.map((t) => (
            <AndonCard key={t.id} task={t} />
          ))}
        </CardContent>
      </Card>

      {/* Pending */}
      <Card className="border-border">
        <CardHeader className="bg-muted rounded-t-lg">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Circle className="h-5 w-5" />
            Pending ({grouped.pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {grouped.pending.map((t) => (
            <AndonCard key={t.id} task={t} />
          ))}
        </CardContent>
      </Card>

      {/* Overdue */}
      <Card className="border-red-200">
        <CardHeader className="bg-red-50 rounded-t-lg">
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Overdue ({grouped.overdue.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {grouped.overdue.map((t) => (
            <AndonCard key={t.id} task={t} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function AndonCard({ task }: { task: Task }) {
  return (
    <div className="p-2 bg-white border rounded-md">
      <div className="flex items-center gap-2">
        <span className="text-lg">{task.icon}</span>
        <span className="font-medium text-sm truncate">{task.name}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {task.deadlineTime}
        {task.completedByName && ` · ${task.completedByName}`}
      </div>
    </div>
  )
}
