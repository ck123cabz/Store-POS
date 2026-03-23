"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Wallet,
  Pencil,
  LogIn,
  LogOut,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/format-currency"
import { useSettings } from "@/hooks/use-settings"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { getValidNextStates } from "@/lib/employee-status"

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

interface EmployeeFormData {
  firstName: string
  lastName: string
  phone: string
  email: string
  position: string
  hourlyRate: string
  startDate: string
  employmentStatus: string
  userId: string
  notes: string
}

interface Shift {
  id: number
  employeeId: number
  clockIn: string
  clockOut: string | null
  breakMinutes: number
  notes: string
  shiftTemplateId: number | null
  shiftTemplate?: { id: number; name: string; color: string } | null
}

interface Payment {
  id: number
  employeeId: number
  periodStart: string
  periodEnd: string
  hoursWorked: number | string
  hourlyRate: number | string
  grossAmount: number | string
  deductions: number | string
  netAmount: number | string
  paidAmount: number | string
  paymentMethod: string
  status: string
  paidAt: string | null
  notes: string
}

interface ShiftTemplate {
  id: number
  name: string
  startTime: string
  endTime: string
  color: string
}

interface ShiftFormData {
  date: string
  clockIn: string
  clockOut: string
  breakMinutes: string
  shiftTemplateId: string
  notes: string
}

interface PaymentFormData {
  periodStart: string
  periodEnd: string
  paidAmount: string
  paymentMethod: string
  notes: string
}

const emptyShiftForm: ShiftFormData = {
  date: new Date().toISOString().split("T")[0],
  clockIn: "",
  clockOut: "",
  breakMinutes: "0",
  shiftTemplateId: "",
  notes: "",
}

const emptyPaymentForm: PaymentFormData = {
  periodStart: "",
  periodEnd: "",
  paidAmount: "",
  paymentMethod: "Cash",
  notes: "",
}

function calcHours(
  clockIn: string,
  clockOut: string | null,
  breakMinutes: number
) {
  if (!clockOut) return 0
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime()
  return Math.max(0, ms / (1000 * 60 * 60) - breakMinutes / 60)
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { currencySymbol } = useSettings()

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [editOpen, setEditOpen] = useState(false)
  const [shiftOpen, setShiftOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [editForm, setEditForm] = useState<EmployeeFormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    position: "",
    hourlyRate: "",
    startDate: "",
    employmentStatus: "Active",
    userId: "",
    notes: "",
  })
  const [shiftForm, setShiftForm] = useState<ShiftFormData>(emptyShiftForm)
  const [paymentForm, setPaymentForm] =
    useState<PaymentFormData>(emptyPaymentForm)

  // Date range for filtering shifts and payments
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 14)
    from.setHours(0, 0, 0, 0)
    return { from, to }
  })

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
    {
      label: "This month",
      getValue: () => {
        const to = new Date()
        const from = new Date(to.getFullYear(), to.getMonth(), 1)
        return { from, to }
      },
    },
  ]

  const fmtCurrency = (value: string | number | null | undefined) =>
    formatCurrency(value, currencySymbol)

  const fetchEmployee = useCallback(async () => {
    try {
      const res = await fetch(`/api/employees/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/employees")
          return
        }
        throw new Error("Failed to fetch employee")
      }
      setEmployee(await res.json())
    } catch {
      toast.error("Failed to load employee")
    }
  }, [id, router])

  const fetchShifts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (dateRange.from) params.set("from", dateRange.from.toISOString())
      if (dateRange.to) params.set("to", dateRange.to.toISOString())
      const res = await fetch(`/api/employees/${id}/shifts?${params}`)
      if (res.ok) {
        setShifts(await res.json())
      }
    } catch {
      // Non-critical
    }
  }, [id, dateRange])

  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (dateRange.from) params.set("from", dateRange.from.toISOString())
      if (dateRange.to) params.set("to", dateRange.to.toISOString())
      const res = await fetch(`/api/employees/${id}/payments?${params}`)
      if (res.ok) {
        setPayments(await res.json())
      }
    } catch {
      // Non-critical
    }
  }, [id, dateRange])

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/shift-templates")
      if (res.ok) {
        setTemplates(await res.json())
      }
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      await Promise.all([
        fetchEmployee(),
        fetchShifts(),
        fetchPayments(),
        fetchTemplates(),
      ])
      setLoading(false)
    }
    loadAll()
  }, [fetchEmployee, fetchShifts, fetchPayments, fetchTemplates])

  // Derived state
  const isClockedIn = shifts.some((s) => s.clockOut === null)
  const recentShifts = [...shifts]
    .sort(
      (a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()
    )

  const totalHours = shifts.reduce(
    (sum, s) => sum + calcHours(s.clockIn, s.clockOut, s.breakMinutes),
    0
  )
  const completedShifts = shifts.filter((s) => s.clockOut !== null)
  const avgHours =
    completedShifts.length > 0 ? totalHours / completedShifts.length : 0
  const hourlyRate = parseFloat(String(employee?.hourlyRate || 0))
  const calculatedPay = totalHours * hourlyRate

  function getInitials(firstName: string, lastName: string) {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "Active":
        return (
          <Badge className="border-transparent bg-status-ok/15 text-status-ok">
            Active
          </Badge>
        )
      case "Inactive":
        return (
          <Badge className="border-transparent bg-muted text-muted-foreground">
            Inactive
          </Badge>
        )
      case "Terminated":
        return (
          <Badge className="border-transparent bg-status-critical/15 text-status-critical">
            Terminated
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  function getPaymentStatusBadge(status: string) {
    switch (status) {
      case "Paid":
        return (
          <Badge className="border-transparent bg-status-ok/15 text-status-ok">
            Paid
          </Badge>
        )
      case "Partial":
        return (
          <Badge className="border-transparent bg-status-warning/15 text-status-warning">
            Partial
          </Badge>
        )
      case "Advance":
        return (
          <Badge className="border-transparent bg-status-warning/15 text-status-warning">
            Advance
          </Badge>
        )
      case "Pending":
        return (
          <Badge className="border-transparent bg-status-info/15 text-status-info">
            Pending
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  function formatDateShort(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  // Edit employee handlers
  function openEditForm() {
    if (!employee) return
    setEditForm({
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone || "",
      email: employee.email || "",
      position: employee.position || "",
      hourlyRate: String(employee.hourlyRate || ""),
      startDate: employee.startDate
        ? new Date(employee.startDate).toISOString().split("T")[0]
        : "",
      employmentStatus: employee.employmentStatus || "Active",
      userId: employee.userId?.toString() || "",
      notes: employee.notes || "",
    })
    setEditOpen(true)
  }

  function handleEditChange(field: keyof EmployeeFormData, value: string) {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) return

    setSubmitting(true)
    try {
      const body = {
        ...editForm,
        hourlyRate: parseFloat(editForm.hourlyRate) || 0,
        userId: editForm.userId ? parseInt(editForm.userId) : null,
      }

      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update employee")
      }

      toast.success("Employee updated")
      setEditOpen(false)
      fetchEmployee()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update employee"
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Clock in/out
  async function handleClockIn() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${id}/clock-in`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to clock in")
      }
      toast.success("Clocked in successfully")
      fetchShifts()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to clock in"
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleClockOut() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/employees/${id}/clock-out`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to clock out")
      }
      toast.success("Clocked out successfully")
      fetchShifts()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to clock out"
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Add shift handlers
  function handleShiftChange(field: keyof ShiftFormData, value: string) {
    setShiftForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleShiftSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shiftForm.clockIn) return

    setSubmitting(true)
    try {
      const body = {
        clockIn: shiftForm.clockIn,
        clockOut: shiftForm.clockOut || null,
        breakMinutes: parseInt(shiftForm.breakMinutes) || 0,
        shiftTemplateId: shiftForm.shiftTemplateId
          ? parseInt(shiftForm.shiftTemplateId)
          : null,
        notes: shiftForm.notes,
      }

      const res = await fetch(`/api/employees/${id}/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add shift")
      }

      toast.success("Shift added")
      setShiftOpen(false)
      setShiftForm(emptyShiftForm)
      fetchShifts()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add shift"
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Record payment handlers
  function handlePaymentChange(field: keyof PaymentFormData, value: string) {
    setPaymentForm((prev) => ({ ...prev, [field]: value }))
  }

  // Calculate estimated amount for selected period
  const estimatedHours = (() => {
    if (!paymentForm.periodStart || !paymentForm.periodEnd) return 0
    const start = new Date(paymentForm.periodStart)
    const end = new Date(paymentForm.periodEnd)
    return shifts
      .filter((s) => {
        const shiftDate = new Date(s.clockIn)
        return shiftDate >= start && shiftDate <= end && s.clockOut !== null
      })
      .reduce(
        (sum, s) => sum + calcHours(s.clockIn, s.clockOut, s.breakMinutes),
        0
      )
  })()
  const estimatedAmount = estimatedHours * hourlyRate

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!paymentForm.periodStart || !paymentForm.periodEnd) return

    setSubmitting(true)
    try {
      const body = {
        periodStart: paymentForm.periodStart,
        periodEnd: paymentForm.periodEnd,
        hoursWorked: estimatedHours,
        hourlyRate: hourlyRate,
        grossAmount: estimatedAmount,
        deductions: 0,
        netAmount: estimatedAmount,
        paidAmount: parseFloat(paymentForm.paidAmount) || 0,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes,
      }

      const res = await fetch(`/api/employees/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to record payment")
      }

      toast.success("Payment recorded")
      setPaymentOpen(false)
      setPaymentForm(emptyPaymentForm)
      fetchPayments()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to record payment"
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="text-sm text-muted-foreground">Employee not found</div>
      </div>
    )
  }

  const fullName = `${employee.firstName} ${employee.lastName}`

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/employees"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Employees
        </Link>
        <span>/</span>
        <span className="text-foreground">{fullName}</span>
      </div>

      {/* Profile Header */}
      <Card className="p-4 md:p-6 shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 text-lg">
              <AvatarFallback>
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">{fullName}</h1>
              <p className="text-sm text-muted-foreground">
                {employee.position || "No position"}
                {" \u00B7 "}
                <span className="font-mono tabular-nums">
                  {fmtCurrency(employee.hourlyRate)}/hr
                </span>
                {" \u00B7 "}
                Since {formatDate(employee.startDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(employee.employmentStatus)}
            <Button variant="outline" size="sm" onClick={openEditForm}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            {isClockedIn ? (
              <Button
                size="sm"
                onClick={handleClockOut}
                disabled={submitting}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Clock Out
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleClockIn}
                disabled={submitting}
              >
                <LogIn className="h-4 w-4 mr-1" />
                Clock In
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <DateRangePicker
          from={dateRange.from}
          to={dateRange.to}
          onChange={(range) => {
            if (range.from && range.to) {
              setDateRange({ from: range.from, to: range.to })
            }
          }}
          presets={dateRangePresets}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Recent Shifts */}
        <div className="lg:col-span-2">
          <Card className="p-0 shadow-none">
            <div className="flex items-center gap-2 p-4 border-b border-border/60">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Recent Shifts</h2>
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShiftForm(emptyShiftForm)
                    setShiftOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Shift
                </Button>
              </div>
            </div>
            <div className="divide-y divide-border/60">
              {recentShifts.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No shifts found for {formatDateShort(dateRange.from.toISOString())} &ndash; {formatDateShort(dateRange.to.toISOString())}
                </div>
              ) : (
                recentShifts.map((shift) => {
                  const hours = calcHours(
                    shift.clockIn,
                    shift.clockOut,
                    shift.breakMinutes
                  )
                  return (
                    <div
                      key={shift.id}
                      className="flex items-center gap-3 p-3 px-4"
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {formatDate(shift.clockIn)}
                          </span>
                          {shift.shiftTemplate && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span
                                className="size-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    shift.shiftTemplate.color ||
                                    "var(--muted-foreground)",
                                }}
                              />
                              {shift.shiftTemplate.name}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono tabular-nums">
                          {formatTime(shift.clockIn)}
                          {" \u2013 "}
                          {shift.clockOut
                            ? formatTime(shift.clockOut)
                            : "In progress"}
                        </span>
                      </div>
                      <span className="text-sm font-mono tabular-nums text-right whitespace-nowrap">
                        {shift.clockOut ? `${hours.toFixed(1)}h` : "\u2014"}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Hours Summary */}
          <Card className="p-0 shadow-none">
            <div className="flex items-center gap-2 p-4 border-b border-border/60">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Hours Summary</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateShort(dateRange.from.toISOString())} &ndash; {formatDateShort(dateRange.to.toISOString())}
              </span>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Hours</span>
                <span className="font-mono tabular-nums">
                  {totalHours.toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shifts Worked</span>
                <span className="font-mono tabular-nums">
                  {completedShifts.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg Hours/Shift</span>
                <span className="font-mono tabular-nums">
                  {avgHours.toFixed(1)}h
                </span>
              </div>
              <div className="border-t border-border/60 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Calculated Pay</span>
                  <span className="text-base font-semibold font-mono tabular-nums text-primary">
                    {fmtCurrency(calculatedPay)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment History */}
          <Card className="p-0 shadow-none">
            <div className="flex items-center gap-2 p-4 border-b border-border/60">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Payment History</h2>
              <div className="ml-auto">
                <Button
                  size="sm"
                  onClick={() => {
                    setPaymentForm({
                      ...emptyPaymentForm,
                      periodStart: dateRange.from.toISOString().split("T")[0],
                      periodEnd: dateRange.to.toISOString().split("T")[0],
                    })
                    setPaymentOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Record Payment
                </Button>
              </div>
            </div>
            <div className="divide-y divide-border/60">
              {payments.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No payments recorded yet
                </div>
              ) : (
                payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center gap-3 p-3 px-4"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium">
                        {payment.paidAt
                          ? formatDate(payment.paidAt)
                          : "Pending"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateShort(payment.periodStart)}
                        {" \u2013 "}
                        {formatDateShort(payment.periodEnd)}
                        {payment.paymentMethod
                          ? ` \u00B7 ${payment.paymentMethod}`
                          : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono tabular-nums">
                        {fmtCurrency(payment.paidAmount)}
                      </span>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={editForm.firstName}
                  onChange={(e) =>
                    handleEditChange("firstName", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={editForm.lastName}
                  onChange={(e) =>
                    handleEditChange("lastName", e.target.value)
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-position">Position</Label>
              <Input
                id="edit-position"
                value={editForm.position}
                onChange={(e) => handleEditChange("position", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-hourlyRate">Hourly Rate</Label>
                <Input
                  id="edit-hourlyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.hourlyRate}
                  onChange={(e) =>
                    handleEditChange("hourlyRate", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) =>
                    handleEditChange("startDate", e.target.value)
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => handleEditChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => handleEditChange("email", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-employmentStatus">Employment Status</Label>
              <Select
                value={editForm.employmentStatus}
                onValueChange={(value) =>
                  handleEditChange("employmentStatus", value)
                }
              >
                <SelectTrigger id="edit-employmentStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={employee.employmentStatus} disabled>
                    {employee.employmentStatus} (current)
                  </SelectItem>
                  {getValidNextStates(employee.employmentStatus).map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => handleEditChange("notes", e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Manual Shift Dialog */}
      <Dialog open={shiftOpen} onOpenChange={setShiftOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Shift</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleShiftSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shift-date">Date</Label>
              <Input
                id="shift-date"
                type="date"
                value={shiftForm.date}
                onChange={(e) => handleShiftChange("date", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift-clockIn">Clock In</Label>
                <Input
                  id="shift-clockIn"
                  type="datetime-local"
                  value={shiftForm.clockIn}
                  onChange={(e) =>
                    handleShiftChange("clockIn", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-clockOut">Clock Out</Label>
                <Input
                  id="shift-clockOut"
                  type="datetime-local"
                  value={shiftForm.clockOut}
                  onChange={(e) =>
                    handleShiftChange("clockOut", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift-breakMinutes">Break (minutes)</Label>
                <Input
                  id="shift-breakMinutes"
                  type="number"
                  min="0"
                  value={shiftForm.breakMinutes}
                  onChange={(e) =>
                    handleShiftChange("breakMinutes", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-template">Shift Template</Label>
                <Select
                  value={shiftForm.shiftTemplateId}
                  onValueChange={(value) =>
                    handleShiftChange("shiftTemplateId", value)
                  }
                >
                  <SelectTrigger id="shift-template">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{
                              backgroundColor:
                                t.color || "var(--muted-foreground)",
                            }}
                          />
                          {t.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-notes">Notes</Label>
              <Textarea
                id="shift-notes"
                value={shiftForm.notes}
                onChange={(e) => handleShiftChange("notes", e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShiftOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Add Shift"}
              </Button>
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
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-periodStart">Period Start</Label>
                <Input
                  id="payment-periodStart"
                  type="date"
                  value={paymentForm.periodStart}
                  onChange={(e) =>
                    handlePaymentChange("periodStart", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-periodEnd">Period End</Label>
                <Input
                  id="payment-periodEnd"
                  type="date"
                  value={paymentForm.periodEnd}
                  onChange={(e) =>
                    handlePaymentChange("periodEnd", e.target.value)
                  }
                  required
                />
              </div>
            </div>
            {paymentForm.periodStart && paymentForm.periodEnd && (
              <div className="rounded-md bg-muted/50 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Estimated Hours
                  </span>
                  <span className="font-mono tabular-nums">
                    {estimatedHours.toFixed(1)}h
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Estimated Amount
                  </span>
                  <span className="font-mono tabular-nums font-medium">
                    {fmtCurrency(estimatedAmount)}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="payment-paidAmount">Paid Amount</Label>
              <Input
                id="payment-paidAmount"
                type="number"
                step="0.01"
                min="0"
                value={paymentForm.paidAmount}
                onChange={(e) =>
                  handlePaymentChange("paidAmount", e.target.value)
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(value) =>
                  handlePaymentChange("paymentMethod", value)
                }
              >
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes</Label>
              <Textarea
                id="payment-notes"
                value={paymentForm.notes}
                onChange={(e) =>
                  handlePaymentChange("notes", e.target.value)
                }
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
