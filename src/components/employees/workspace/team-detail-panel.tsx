"use client"

import { useState, useEffect, useCallback } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { StatCard } from "./shared/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { formatCurrency } from "@/lib/format-currency"
import { useSettings } from "@/hooks/use-settings"
import {
  Pencil,
  Clock,
  Wallet,
  CheckSquare,
  Activity,
  Plus,
  LogIn,
  LogOut,
} from "lucide-react"
import { toast } from "sonner"

interface Employee {
  id: number
  firstName: string
  lastName: string
  phone: string
  email: string
  position: string
  hourlyRate: number | string
  employmentStatus: string
  startDate: string
  userId: number | null
  notes: string
  user?: { id: number; username: string; fullname: string } | null
}

interface Shift {
  id: number
  clockIn: string
  clockOut: string | null
  breakMinutes: number
  notes: string
  shiftTemplate?: { id: number; name: string; color: string } | null
}

interface Payment {
  id: number
  periodStart: string
  periodEnd: string
  hoursWorked: number | string
  calculatedAmount: number | string
  paidAmount: number | string
  paymentMethod: string
  status: string
  paidDate: string | null
  notes: string
}

interface ShiftTemplate {
  id: number
  name: string
  startTime: string
  endTime: string
  color: string
}

type SubTab = "overview" | "shifts" | "payments" | "tasks" | "activity"

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()
}

function getStatusBadge(status: string) {
  switch (status) {
    case "Active":
      return <Badge className="border-transparent bg-status-ok/15 text-status-ok">Active</Badge>
    case "Inactive":
      return <Badge className="border-transparent bg-muted text-muted-foreground">Inactive</Badge>
    case "Terminated":
      return <Badge className="border-transparent bg-status-critical/15 text-status-critical">Terminated</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function calcHours(clockIn: string, clockOut: string | null, breakMinutes: number) {
  if (!clockOut) return 0
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime()
  return Math.max(0, ms / (1000 * 60 * 60) - breakMinutes / 60)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

const dateRangePresets = [
  {
    label: "Last 7 days",
    getValue: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 7)
      from.setHours(0, 0, 0, 0)
      return { from, to }
    },
  },
  {
    label: "Last 14 days",
    getValue: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 14)
      from.setHours(0, 0, 0, 0)
      return { from, to }
    },
  },
  {
    label: "Last 30 days",
    getValue: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 30)
      from.setHours(0, 0, 0, 0)
      return { from, to }
    },
  },
]

interface TeamDetailPanelProps {
  employee: Employee
  onEdit: () => void
}

export default function TeamDetailPanel({ employee, onEdit }: TeamDetailPanelProps) {
  const { currencySymbol } = useSettings()
  const fmtCurrency = (v: string | number | null | undefined) => formatCurrency(v, currencySymbol)
  const [subTab, setSubTab] = useState<SubTab>("overview")
  const [shifts, setShifts] = useState<Shift[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [loadingPayments, setLoadingPayments] = useState(false)

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 14)
    from.setHours(0, 0, 0, 0)
    return { from, to }
  })

  // Shift form
  const [shiftOpen, setShiftOpen] = useState(false)
  const [shiftForm, setShiftForm] = useState({
    date: new Date().toISOString().split("T")[0],
    clockIn: "",
    clockOut: "",
    breakMinutes: "0",
    shiftTemplateId: "",
    notes: "",
  })

  // Payment form
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    periodStart: "",
    periodEnd: "",
    paidAmount: "",
    paymentMethod: "Cash",
    notes: "",
  })

  const [submitting, setSubmitting] = useState(false)

  const fetchShifts = useCallback(async () => {
    setLoadingShifts(true)
    try {
      const from = dateRange.from.toISOString()
      const to = dateRange.to.toISOString()
      const res = await fetch(`/api/employees/${employee.id}/shifts?from=${from}&to=${to}`)
      if (res.ok) setShifts(await res.json())
    } catch { /* non-critical */ }
    setLoadingShifts(false)
  }, [employee.id, dateRange])

  const fetchPayments = useCallback(async () => {
    setLoadingPayments(true)
    try {
      const from = dateRange.from.toISOString()
      const to = dateRange.to.toISOString()
      const res = await fetch(`/api/employees/${employee.id}/payments?from=${from}&to=${to}`)
      if (res.ok) setPayments(await res.json())
    } catch { /* non-critical */ }
    setLoadingPayments(false)
  }, [employee.id, dateRange])

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/shift-templates")
      if (res.ok) setTemplates(await res.json())
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    fetchShifts()
    fetchPayments()
    fetchTemplates()
  }, [fetchShifts, fetchPayments, fetchTemplates])

  // Clock in/out
  async function handleClockIn() {
    try {
      const res = await fetch(`/api/employees/${employee.id}/clock-in`, { method: "POST" })
      if (!res.ok) throw new Error()
      toast.success("Clocked in")
      fetchShifts()
    } catch {
      toast.error("Failed to clock in")
    }
  }

  async function handleClockOut() {
    try {
      const res = await fetch(`/api/employees/${employee.id}/clock-out`, { method: "POST" })
      if (!res.ok) throw new Error()
      toast.success("Clocked out")
      fetchShifts()
    } catch {
      toast.error("Failed to clock out")
    }
  }

  async function handleAddShift(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body = {
        date: shiftForm.date,
        clockIn: `${shiftForm.date}T${shiftForm.clockIn}:00`,
        clockOut: shiftForm.clockOut ? `${shiftForm.date}T${shiftForm.clockOut}:00` : null,
        breakMinutes: parseInt(shiftForm.breakMinutes) || 0,
        shiftTemplateId: shiftForm.shiftTemplateId ? parseInt(shiftForm.shiftTemplateId) : null,
        notes: shiftForm.notes,
      }
      const res = await fetch(`/api/employees/${employee.id}/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success("Shift added")
      setShiftOpen(false)
      fetchShifts()
    } catch {
      toast.error("Failed to add shift")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body = {
        periodStart: paymentForm.periodStart,
        periodEnd: paymentForm.periodEnd,
        paidAmount: parseFloat(paymentForm.paidAmount) || 0,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes,
      }
      const res = await fetch(`/api/employees/${employee.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success("Payment recorded")
      setPaymentOpen(false)
      fetchPayments()
    } catch {
      toast.error("Failed to record payment")
    } finally {
      setSubmitting(false)
    }
  }

  const totalHours = shifts.reduce((acc, s) => acc + calcHours(s.clockIn, s.clockOut, s.breakMinutes), 0)
  const avgHours = shifts.length > 0 ? totalHours / shifts.length : 0
  const calculatedPay = totalHours * Number(employee.hourlyRate || 0)
  const isClockedIn = shifts.some((s) => !s.clockOut)

  const subTabs: { key: SubTab; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "shifts", label: "Shifts", icon: Clock },
    { key: "payments", label: "Payments", icon: Wallet },
    { key: "tasks", label: "Tasks", icon: CheckSquare },
    { key: "activity", label: "Activity", icon: Activity },
  ]

  function getPaymentStatusBadge(status: string) {
    switch (status) {
      case "Paid":
        return <Badge className="border-transparent bg-status-ok/15 text-status-ok">Paid</Badge>
      case "Partial":
        return <Badge className="border-transparent bg-status-warning/15 text-status-warning">Partial</Badge>
      case "Pending":
        return <Badge className="border-transparent bg-status-info/15 text-status-info">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{getInitials(employee.firstName, employee.lastName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">
                {employee.firstName} {employee.lastName}
              </h3>
              {getStatusBadge(employee.employmentStatus)}
            </div>
            <p className="text-xs text-muted-foreground">
              {employee.position || "No position"} &middot;{" "}
              <span className="font-mono tabular-nums">{fmtCurrency(employee.hourlyRate)}/hr</span>
              {employee.startDate && ` \u00B7 Since ${formatDate(employee.startDate)}`}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="size-3.5 mr-1" /> Edit
          </Button>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1 border-b border-border/60 px-4 overflow-x-auto">
        {subTabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSubTab(key)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              subTab === key
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {subTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Hours 14d" value={totalHours.toFixed(1)} />
              <StatCard label="Avg/Shift" value={avgHours.toFixed(1)} />
              <StatCard label="Est. Pay" value={fmtCurrency(calculatedPay)} />
            </div>
            {(employee.phone || employee.email) && (
              <Card className="p-4 shadow-none space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</h4>
                {employee.phone && <p className="text-sm">{employee.phone}</p>}
                {employee.email && <p className="text-sm">{employee.email}</p>}
              </Card>
            )}
            {employee.user && (
              <Card className="p-4 shadow-none space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</h4>
                <p className="text-sm">
                  Linked to <strong>{employee.user.fullname}</strong> ({employee.user.username})
                </p>
              </Card>
            )}
            {employee.notes && (
              <Card className="p-4 shadow-none space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</h4>
                <p className="text-sm whitespace-pre-wrap">{employee.notes}</p>
              </Card>
            )}
          </div>
        )}

        {subTab === "shifts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <DateRangePicker
                from={dateRange.from}
                to={dateRange.to}
                onChange={(range) => {
                  if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to })
                }}
                presets={dateRangePresets}
              />
              <div className="flex gap-2">
                {isClockedIn ? (
                  <Button size="sm" variant="outline" onClick={handleClockOut}>
                    <LogOut className="size-3.5 mr-1" /> Clock Out
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleClockIn}>
                    <LogIn className="size-3.5 mr-1" /> Clock In
                  </Button>
                )}
                <Button size="sm" onClick={() => setShiftOpen(true)}>
                  <Plus className="size-3.5 mr-1" /> Add Shift
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total Hours" value={totalHours.toFixed(1)} />
              <StatCard label="Avg/Shift" value={avgHours.toFixed(1)} />
              <StatCard label="Est. Pay" value={fmtCurrency(calculatedPay)} />
            </div>

            {loadingShifts ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading shifts...</p>
            ) : shifts.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-8 w-8" />}
                title="No shifts"
                description="No shifts found for the selected period."
              />
            ) : (
              <div className="space-y-2">
                {shifts.map((shift) => {
                  const hours = calcHours(shift.clockIn, shift.clockOut, shift.breakMinutes)
                  return (
                    <Card key={shift.id} className="p-3 shadow-none">
                      <div className="flex items-center gap-3">
                        {shift.shiftTemplate && (
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: shift.shiftTemplate.color }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {formatDate(shift.clockIn)}
                            {shift.shiftTemplate && ` \u00B7 ${shift.shiftTemplate.name}`}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono tabular-nums">
                            {formatTime(shift.clockIn)} &ndash;{" "}
                            {shift.clockOut ? formatTime(shift.clockOut) : "In progress"}
                            {shift.breakMinutes > 0 && ` (${shift.breakMinutes}m break)`}
                          </p>
                        </div>
                        <span className="text-sm font-mono tabular-nums font-medium">
                          {hours.toFixed(1)}h
                        </span>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {subTab === "payments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <DateRangePicker
                from={dateRange.from}
                to={dateRange.to}
                onChange={(range) => {
                  if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to })
                }}
                presets={dateRangePresets}
              />
              <Button
                size="sm"
                onClick={() => {
                  setPaymentForm({
                    periodStart: dateRange.from.toISOString().split("T")[0],
                    periodEnd: dateRange.to.toISOString().split("T")[0],
                    paidAmount: calculatedPay.toFixed(2),
                    paymentMethod: "Cash",
                    notes: "",
                  })
                  setPaymentOpen(true)
                }}
              >
                <Plus className="size-3.5 mr-1" /> Record Payment
              </Button>
            </div>

            {loadingPayments ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading payments...</p>
            ) : payments.length === 0 ? (
              <EmptyState
                icon={<Wallet className="h-8 w-8" />}
                title="No payments"
                description="No payments found for the selected period."
              />
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <Card key={p.id} className="p-3 shadow-none">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {formatDate(p.periodStart)} &ndash; {formatDate(p.periodEnd)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.paymentMethod} &middot;{" "}
                          <span className="font-mono tabular-nums">{Number(p.hoursWorked).toFixed(1)}h</span>
                        </p>
                      </div>
                      <span className="font-mono tabular-nums text-sm font-medium">
                        {fmtCurrency(p.paidAmount)}
                      </span>
                      {getPaymentStatusBadge(p.status)}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {subTab === "tasks" && (
          <EmptyState
            icon={<CheckSquare className="h-8 w-8" />}
            title="Employee tasks"
            description="Task completion history will appear here."
          />
        )}

        {subTab === "activity" && (
          <div className="space-y-3">
            {shifts.length === 0 && payments.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-8 w-8" />}
                title="No activity"
                description="Activity timeline will appear as shifts and payments are recorded."
              />
            ) : (
              <>
                {/* Compose timeline from shifts and payments */}
                {[
                  ...shifts.map((s) => ({
                    type: "shift" as const,
                    date: s.clockIn,
                    data: s,
                  })),
                  ...payments.map((p) => ({
                    type: "payment" as const,
                    date: p.periodEnd,
                    data: p,
                  })),
                ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 20)
                  .map((item, i) => (
                    <div key={`${item.type}-${i}`} className="flex gap-3 items-start">
                      <div className="mt-1">
                        {item.type === "shift" ? (
                          <Clock className="size-3.5 text-muted-foreground" />
                        ) : (
                          <Wallet className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          {item.type === "shift"
                            ? `Worked ${calcHours((item.data as Shift).clockIn, (item.data as Shift).clockOut, (item.data as Shift).breakMinutes).toFixed(1)}h`
                            : `Payment: ${fmtCurrency((item.data as Payment).paidAmount)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(item.date)}
                        </p>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Shift Dialog */}
      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Shift</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddShift} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shiftDate">Date</Label>
              <Input
                id="shiftDate"
                type="date"
                value={shiftForm.date}
                onChange={(e) => setShiftForm((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shiftClockIn">Clock In</Label>
                <Input
                  id="shiftClockIn"
                  type="time"
                  value={shiftForm.clockIn}
                  onChange={(e) => setShiftForm((p) => ({ ...p, clockIn: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shiftClockOut">Clock Out</Label>
                <Input
                  id="shiftClockOut"
                  type="time"
                  value={shiftForm.clockOut}
                  onChange={(e) => setShiftForm((p) => ({ ...p, clockOut: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="breakMinutes">Break (min)</Label>
                <Input
                  id="breakMinutes"
                  type="number"
                  min="0"
                  value={shiftForm.breakMinutes}
                  onChange={(e) => setShiftForm((p) => ({ ...p, breakMinutes: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shiftTemplate">Template</Label>
                <Select
                  value={shiftForm.shiftTemplateId}
                  onValueChange={(val) => setShiftForm((p) => ({ ...p, shiftTemplateId: val }))}
                >
                  <SelectTrigger id="shiftTemplate">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shiftNotes">Notes</Label>
              <Textarea
                id="shiftNotes"
                value={shiftForm.notes}
                onChange={(e) => setShiftForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShiftOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add Shift"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payPeriodStart">Period Start</Label>
                <Input
                  id="payPeriodStart"
                  type="date"
                  value={paymentForm.periodStart}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, periodStart: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payPeriodEnd">Period End</Label>
                <Input
                  id="payPeriodEnd"
                  type="date"
                  value={paymentForm.periodEnd}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, periodEnd: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payAmount">Amount</Label>
                <Input
                  id="payAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.paidAmount}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, paidAmount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payMethod">Method</Label>
                <Select
                  value={paymentForm.paymentMethod}
                  onValueChange={(val) => setPaymentForm((p) => ({ ...p, paymentMethod: val }))}
                >
                  <SelectTrigger id="payMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payNotes">Notes</Label>
              <Textarea
                id="payNotes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Recording..." : "Record Payment"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
