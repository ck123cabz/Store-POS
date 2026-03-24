"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ShiftTemplate {
  id: number
  name: string
  startTime: string
  endTime: string
  color: string
  isActive: boolean
}

interface WeekOverview {
  weekStart: string
  weekEnd: string
  grid: {
    templateId: number
    templateName: string
    color: string
    days: number[]
  }[]
  totals: number[]
}

interface TemplateForm {
  name: string
  startTime: string
  endTime: string
  color: string
}

const emptyForm: TemplateForm = {
  name: "",
  startTime: "09:00",
  endTime: "17:00",
  color: "#3B82F6",
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function calcDuration(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function ScheduleTab() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOverview, setWeekOverview] = useState<WeekOverview | null>(null)
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))

  // Form state
  const [formOpen, setFormOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<ShiftTemplate | null>(null)
  const [formData, setFormData] = useState<TemplateForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/shift-templates")
      if (res.ok) setTemplates(await res.json())
    } catch { /* non-critical */ }
    setLoading(false)
  }, [])

  const fetchWeekOverview = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/shift-templates/week-overview?weekStart=${weekStart.toISOString().split("T")[0]}`
      )
      if (res.ok) setWeekOverview(await res.json())
    } catch { /* non-critical */ }
  }, [weekStart])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  useEffect(() => {
    fetchWeekOverview()
  }, [fetchWeekOverview])

  function openForm(template?: ShiftTemplate) {
    setEditTemplate(template || null)
    setFormData(
      template
        ? { name: template.name, startTime: template.startTime, endTime: template.endTime, color: template.color }
        : emptyForm
    )
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditTemplate(null)
    setFormData(emptyForm)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) return
    setSubmitting(true)
    try {
      const url = editTemplate
        ? `/api/shift-templates/${editTemplate.id}`
        : "/api/shift-templates"
      const method = editTemplate ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error()
      toast.success(editTemplate ? "Template updated" : "Template created")
      closeForm()
      fetchTemplates()
      fetchWeekOverview()
    } catch {
      toast.error("Failed to save template")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/shift-templates/${deleteId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Template deleted")
      fetchTemplates()
      fetchWeekOverview()
    } catch {
      toast.error("Failed to delete template")
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  function prevWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  function nextWeek() {
    setWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return (
    <div className="space-y-6">
      {/* Template List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Shift Templates</h2>
          <Button size="sm" onClick={() => openForm()}>
            <Plus className="size-3.5 mr-1" /> New Template
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-8 w-8" />}
            title="No shift templates"
            description="Create your first shift template to organize scheduling."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => (
              <Card key={t.id} className="p-3 shadow-none">
                <div className="flex items-center gap-3">
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground font-mono tabular-nums">
                      {t.startTime} &ndash; {t.endTime} ({calcDuration(t.startTime, t.endTime)})
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openForm(t)} className="size-8">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(t.id)} className="size-8">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Week Overview Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Weekly Overview</h2>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={prevWeek} className="size-8">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground font-mono tabular-nums min-w-[160px] text-center">
              {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" \u2013 "}
              {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <Button size="icon" variant="ghost" onClick={nextWeek} className="size-8">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {weekOverview && weekOverview.grid.length > 0 ? (
          <Card className="p-0 shadow-none overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left p-3 font-medium text-muted-foreground">Template</th>
                  {DAY_LABELS.map((day) => (
                    <th key={day} className="p-3 font-medium text-muted-foreground text-center w-16">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekOverview.grid.map((row) => (
                  <tr key={row.templateId} className="border-b border-border/40">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: row.color }}
                        />
                        <span className="truncate">{row.templateName}</span>
                      </div>
                    </td>
                    {row.days.map((count, i) => (
                      <td key={i} className="p-3 text-center font-mono tabular-nums">
                        {count || <span className="text-muted-foreground/40">&ndash;</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/60 font-medium">
                  <td className="p-3 text-muted-foreground">Total</td>
                  {weekOverview.totals.map((total, i) => (
                    <td key={i} className="p-3 text-center font-mono tabular-nums">
                      {total}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </Card>
        ) : (
          <Card className="p-6 shadow-none">
            <p className="text-sm text-muted-foreground text-center">
              No shift data for this week.
            </p>
          </Card>
        )}
      </div>

      {/* Template Form Dialog */}
      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTemplate ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tmplName">Name</Label>
              <Input
                id="tmplName"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Morning Shift"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tmplStart">Start Time</Label>
                <Input
                  id="tmplStart"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tmplEnd">End Time</Label>
                <Input
                  id="tmplEnd"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tmplColor">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="tmplColor"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))}
                  className="size-8 rounded border border-border cursor-pointer"
                />
                <span className="text-sm text-muted-foreground font-mono">{formData.color}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the shift template. Existing shift logs will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
