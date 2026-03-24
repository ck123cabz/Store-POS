"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Circle,
  Loader2,
  CircleCheck,
  AlertTriangle,
  Plus,
  CheckSquare,
  Check,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface TodayTask {
  id: number
  name: string
  type: string
  description: string | null
  deadlineTime: string
  assignedToId: number | null
  assignedToName: string | null
  required: boolean
  status: "pending" | "in_progress" | "completed" | "overdue"
  completedByName: string | null
}

interface AllTask {
  id: number
  name: string
  type: string
  description: string | null
  deadlineTime: string
  assignmentType: string
  status: string
  isActive: boolean
  createdBy?: { fullname: string }
  createdAt?: string
}

interface SimpleUser {
  id: number
  username: string
  fullname: string
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Circle className="size-4 text-muted-foreground" />,
  in_progress: <Loader2 className="size-4 text-status-info animate-spin" />,
  completed: <CircleCheck className="size-4 text-status-ok" />,
  overdue: <AlertTriangle className="size-4 text-status-warning" />,
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function TasksTab() {
  const [filter, setFilter] = useState("all")
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([])
  const [allTasks, setAllTasks] = useState<AllTask[]>([])
  const [users, setUsers] = useState<SimpleUser[]>([])
  const [loading, setLoading] = useState(true)

  // New task form
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [taskForm, setTaskForm] = useState({
    name: "",
    type: "action",
    description: "",
    deadlineTime: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5] as number[],
    assignmentType: "anyone",
    assignedToId: "",
    required: false,
    streakBreaking: false,
  })

  // Reject note
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState("")

  const fetchTodayTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/today")
      if (res.ok) {
        const data = await res.json()
        setTodayTasks(data.tasks || [])
      }
    } catch { /* non-critical */ }
  }, [])

  const fetchAllTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks")
      if (res.ok) setAllTasks(await res.json())
    } catch { /* non-critical */ }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) setUsers(await res.json())
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTodayTasks(), fetchAllTasks(), fetchUsers()]).finally(() =>
      setLoading(false)
    )
  }, [fetchTodayTasks, fetchAllTasks, fetchUsers])

  const pendingApproval = allTasks.filter((t) => t.status === "pending")

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskForm.name.trim()) return
    setSubmitting(true)
    try {
      const body = {
        name: taskForm.name,
        type: taskForm.type,
        description: taskForm.description || null,
        deadlineTime: taskForm.deadlineTime,
        daysOfWeek: taskForm.daysOfWeek,
        assignmentType: taskForm.assignmentType,
        assignedToId: taskForm.assignmentType === "specific" && taskForm.assignedToId
          ? parseInt(taskForm.assignedToId)
          : null,
        required: taskForm.required,
        streakBreaking: taskForm.streakBreaking,
      }
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success("Task created")
      setFormOpen(false)
      setTaskForm({
        name: "",
        type: "action",
        description: "",
        deadlineTime: "17:00",
        daysOfWeek: [1, 2, 3, 4, 5],
        assignmentType: "anyone",
        assignedToId: "",
        required: false,
        streakBreaking: false,
      })
      fetchTodayTasks()
      fetchAllTasks()
    } catch {
      toast.error("Failed to create task")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApprove(taskId: number) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/approve`, { method: "POST" })
      if (!res.ok) throw new Error()
      toast.success("Task approved")
      fetchAllTasks()
      fetchTodayTasks()
    } catch {
      toast.error("Failed to approve task")
    }
  }

  async function handleReject(taskId: number) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: rejectNote }),
      })
      if (!res.ok) throw new Error()
      toast.success("Task rejected")
      setRejectId(null)
      setRejectNote("")
      fetchAllTasks()
      fetchTodayTasks()
    } catch {
      toast.error("Failed to reject task")
    }
  }

  // Filtered today tasks
  const filteredTasks = filter === "pending"
    ? todayTasks.filter((t) => t.status === "pending" || t.status === "overdue")
    : filter === "active"
      ? todayTasks.filter((t) => t.status === "in_progress")
      : todayTasks

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading tasks...</p>
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(val) => { if (val) setFilter(val) }}
          size="sm"
          variant="outline"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="pending">Pending</ToggleGroupItem>
          <ToggleGroupItem value="active">Active</ToggleGroupItem>
        </ToggleGroup>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-3.5 mr-1" /> New Task
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List */}
        <div className="lg:col-span-2">
          <h3 className="font-semibold text-sm mb-3">Today&apos;s Tasks</h3>
          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="h-8 w-8" />}
              title="No tasks"
              description={filter !== "all" ? "No tasks match the current filter." : "Create a task to get started."}
            />
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <Card key={task.id} className="p-3 shadow-none">
                  <div className="flex items-center gap-3">
                    {statusIcons[task.status] || statusIcons.pending}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{task.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{task.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {task.assignedToName || "Anyone"} &middot;{" "}
                        <span className="font-mono tabular-nums">{task.deadlineTime}</span>
                        {task.completedByName && ` \u00B7 Done by ${task.completedByName}`}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        "shrink-0",
                        task.status === "completed"
                          ? "border-transparent bg-status-ok/15 text-status-ok"
                          : task.status === "in_progress"
                            ? "border-transparent bg-status-info/15 text-status-info"
                            : task.status === "overdue"
                              ? "border-transparent bg-status-warning/15 text-status-warning"
                              : "border-transparent bg-muted text-muted-foreground"
                      )}
                    >
                      {task.status === "in_progress" ? "In Progress" : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Approval Queue */}
        <div>
          <h3 className="font-semibold text-sm mb-3">
            Pending Approval
            {pendingApproval.length > 0 && (
              <Badge className="ml-2 border-transparent bg-status-warning/15 text-status-warning">
                {pendingApproval.length}
              </Badge>
            )}
          </h3>
          {pendingApproval.length === 0 ? (
            <Card className="p-6 shadow-none">
              <p className="text-sm text-muted-foreground text-center">
                No tasks pending approval.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {pendingApproval.map((task) => (
                <Card key={task.id} className="p-3 shadow-none">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">{task.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.createdBy?.fullname || "Unknown"} &middot; {task.type}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                      )}
                    </div>
                    {rejectId === task.id ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="Rejection note (optional)"
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          className="text-xs"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setRejectId(null); setRejectNote("") }}>
                            Cancel
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(task.id)}>
                            Confirm Reject
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(task.id)} className="flex-1">
                          <Check className="size-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectId(task.id)} className="flex-1">
                          <X className="size-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Task Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taskName">Name</Label>
              <Input
                id="taskName"
                value={taskForm.name}
                onChange={(e) => setTaskForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskType">Type</Label>
                <Select
                  value={taskForm.type}
                  onValueChange={(val) => setTaskForm((p) => ({ ...p, type: val }))}
                >
                  <SelectTrigger id="taskType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="action">Action</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDeadline">Deadline</Label>
                <Input
                  id="taskDeadline"
                  type="time"
                  value={taskForm.deadlineTime}
                  onChange={(e) => setTaskForm((p) => ({ ...p, deadlineTime: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskDesc">Description</Label>
              <Textarea
                id="taskDesc"
                value={taskForm.description}
                onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <ToggleGroup
                type="multiple"
                value={taskForm.daysOfWeek.map(String)}
                onValueChange={(vals) => setTaskForm((p) => ({ ...p, daysOfWeek: vals.map(Number) }))}
                size="sm"
                variant="outline"
              >
                {DAYS.map((day, i) => (
                  <ToggleGroupItem key={i} value={String(i)}>{day}</ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskAssignment">Assignment</Label>
                <Select
                  value={taskForm.assignmentType}
                  onValueChange={(val) => setTaskForm((p) => ({ ...p, assignmentType: val }))}
                >
                  <SelectTrigger id="taskAssignment"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anyone">Anyone</SelectItem>
                    <SelectItem value="specific">Specific Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {taskForm.assignmentType === "specific" && (
                <div className="space-y-2">
                  <Label htmlFor="taskAssignee">Assign To</Label>
                  <Select
                    value={taskForm.assignedToId}
                    onValueChange={(val) => setTaskForm((p) => ({ ...p, assignedToId: val }))}
                  >
                    <SelectTrigger id="taskAssignee"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.fullname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={taskForm.required}
                  onChange={(e) => setTaskForm((p) => ({ ...p, required: e.target.checked }))}
                  className="rounded border-border"
                />
                Required
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={taskForm.streakBreaking}
                  onChange={(e) => setTaskForm((p) => ({ ...p, streakBreaking: e.target.checked }))}
                  className="rounded border-border"
                />
                Streak-breaking
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Task"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
