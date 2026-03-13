"use client"

import { useState, useEffect, useCallback } from "react"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Eye,
  LayoutDashboard,
  List,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/format-currency"
import { useSettings } from "@/hooks/use-settings"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { SummaryCard, SummaryCardGrid } from "@/components/ui/summary-card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusDot } from "@/components/ui/status-dot"

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

interface ClockedInShift {
  id: number
  employeeId: number
  employee: {
    id: number
    firstName: string
    lastName: string
    position: string
  }
  clockIn: string
}

interface ShiftTemplate {
  id: number
  name: string
  startTime: string
  endTime: string
  color: string
  assignmentCount?: number
}

const emptyFormData: EmployeeFormData = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  position: "",
  hourlyRate: "",
  startDate: new Date().toISOString().split("T")[0],
  employmentStatus: "Active",
  userId: "",
  notes: "",
}

export default function EmployeesPage() {
  const { currencySymbol } = useSettings()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [clockedIn, setClockedIn] = useState<ClockedInShift[]>([])
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"dashboard" | "list">("dashboard")
  const [formOpen, setFormOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState("")
  const [formData, setFormData] = useState<EmployeeFormData>(emptyFormData)

  const fmtCurrency = (value: string | number | null | undefined) =>
    formatCurrency(value, currencySymbol)

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/employees")
      if (res.ok) {
        setEmployees(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/employees/stats")
      if (res.ok) {
        const data = await res.json()
        setClockedIn(data.clockedIn || [])
      }
    } catch {
      // Stats are non-critical
    }
  }, [])

  const fetchShiftTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/shift-templates")
      if (res.ok) {
        setShiftTemplates(await res.json())
      }
    } catch {
      // Shift templates are non-critical
    }
  }, [])

  useEffect(() => {
    fetchEmployees()
    fetchStats()
    fetchShiftTemplates()
  }, [fetchEmployees, fetchStats, fetchShiftTemplates])

  // Summary calculations
  const activeCount = employees.filter(
    (e) => e.employmentStatus === "Active"
  ).length

  const pendingPayments = 0 // Will be populated from stats endpoint

  function openForm(employee?: Employee) {
    setEditEmployee(employee || null)
    setFormData({
      firstName: employee?.firstName || "",
      lastName: employee?.lastName || "",
      phone: employee?.phone || "",
      email: employee?.email || "",
      position: employee?.position || "",
      hourlyRate: employee?.hourlyRate?.toString() || "",
      startDate: employee?.startDate
        ? new Date(employee.startDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      employmentStatus: employee?.employmentStatus || "Active",
      userId: employee?.userId?.toString() || "",
      notes: employee?.notes || "",
    })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditEmployee(null)
    setFormData(emptyFormData)
  }

  function handleInputChange(field: keyof EmployeeFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.firstName.trim() || !formData.lastName.trim()) return

    setSubmitting(true)
    try {
      const url = editEmployee
        ? `/api/employees/${editEmployee.id}`
        : "/api/employees"
      const method = editEmployee ? "PUT" : "POST"

      const body = {
        ...formData,
        hourlyRate: parseFloat(formData.hourlyRate) || 0,
        userId: formData.userId ? parseInt(formData.userId) : null,
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save employee")
      }

      toast.success(editEmployee ? "Employee updated" : "Employee created")
      closeForm()
      fetchEmployees()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save employee"
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/employees/${deleteId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete employee")
      }
      toast.success("Employee deleted")
      fetchEmployees()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete employee"
      )
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

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

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Filtered employees for list view
  const filteredEmployees = employees.filter((e) => {
    if (!search) return true
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase()
    return fullName.includes(search.toLowerCase())
  })

  // DataTable column definitions
  const columns: DataTableColumn<Employee>[] = [
    {
      id: "name",
      header: "Name",
      cell: (e) => {
        const initials = getInitials(e.firstName, e.lastName)
        return (
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">
                {e.firstName} {e.lastName}
              </span>
              {e.phone && (
                <span className="text-xs text-muted-foreground">{e.phone}</span>
              )}
            </div>
          </div>
        )
      },
      priority: 0,
      sortable: true,
    },
    {
      id: "position",
      header: "Position",
      cell: (e) => e.position || "\u2014",
      priority: 1,
    },
    {
      id: "status",
      header: "Status",
      cell: (e) => getStatusBadge(e.employmentStatus),
      priority: 0,
    },
    {
      id: "hourlyRate",
      header: "Rate/hr",
      cell: (e) => (
        <span className="font-mono tabular-nums">
          {fmtCurrency(e.hourlyRate)}
        </span>
      ),
      priority: 1,
      align: "right",
    },
    {
      id: "actions",
      header: "",
      cell: (e) => (
        <div
          className="flex items-center gap-1"
          onClick={(ev) => ev.stopPropagation()}
        >
          <Link href={`/employees/${e.id}`}>
            <Button
              size="icon"
              variant="ghost"
              className="min-h-11 min-w-11"
              aria-label={`View ${e.firstName} ${e.lastName}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => openForm(e)}
            className="min-h-11 min-w-11"
            aria-label={`Edit ${e.firstName} ${e.lastName}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDeleteId(e.id)}
            className="min-h-11 min-w-11"
            aria-label={`Delete ${e.firstName} ${e.lastName}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      priority: 0,
      align: "right",
    },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Employees
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your team, shifts, and payroll
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border/60">
            <Button
              variant={view === "dashboard" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("dashboard")}
              className="rounded-r-none"
            >
              <LayoutDashboard className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
          </div>
          <Button onClick={() => openForm()}>
            <Plus className="h-4 w-4 mr-2" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Dashboard View */}
      {view === "dashboard" && (
        <>
          <SummaryCardGrid>
            <SummaryCard
              label="Active Employees"
              value={activeCount.toString()}
            />
            <SummaryCard label="Hours This Period" value={"\u2014"} />
            <SummaryCard label="Payroll Due" value={"\u2014"} />
            <SummaryCard
              label="Pending Payments"
              value={pendingPayments.toString()}
            />
          </SummaryCardGrid>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Currently Clocked In */}
            <Card className="p-0 shadow-none">
              <div className="flex items-center gap-2 p-4 border-b border-border/60">
                <StatusDot variant="ok" pulse />
                <h2 className="font-semibold text-sm">Currently Clocked In</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {clockedIn.length} active
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {clockedIn.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No employees clocked in
                  </div>
                ) : (
                  clockedIn.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center gap-3 p-3 px-4"
                    >
                      <Avatar size="sm">
                        <AvatarFallback>
                          {getInitials(
                            shift.employee.firstName,
                            shift.employee.lastName
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate">
                          {shift.employee.firstName} {shift.employee.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {shift.employee.position}
                        </span>
                      </div>
                      <span className="ml-auto text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap">
                        In at {formatTime(shift.clockIn)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Today's Shifts */}
            <Card className="p-0 shadow-none">
              <div className="flex items-center gap-2 p-4 border-b border-border/60">
                <h2 className="font-semibold text-sm">Today&apos;s Shifts</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {shiftTemplates.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No shift templates configured
                  </div>
                ) : (
                  shiftTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center gap-3 p-3 px-4"
                    >
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: template.color || "var(--muted-foreground)",
                        }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-sm truncate">
                          {template.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono tabular-nums">
                          {template.startTime} &ndash; {template.endTime}
                        </span>
                      </div>
                      {template.assignmentCount !== undefined && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {template.assignmentCount} assigned
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* List View */}
      {view === "list" && (
        <>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <DataTable
            columns={columns}
            data={filteredEmployees}
            rowKey={(e) => e.id}
            onRowClick={(e) => {
              window.location.href = `/employees/${e.id}`
            }}
            loading={loading}
            emptyIcon={<Briefcase className="h-10 w-10" />}
            emptyTitle="No employees found"
            emptyDescription="Add your first employee to get started."
          />
        </>
      )}

      {/* Add/Edit Employee Dialog */}
      <Dialog open={formOpen} onOpenChange={closeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editEmployee ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => handleInputChange("position", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourlyRate}
                  onChange={(e) =>
                    handleInputChange("hourlyRate", e.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    handleInputChange("startDate", e.target.value)
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
            </div>
            {editEmployee && (
              <div className="space-y-2">
                <Label htmlFor="employmentStatus">Employment Status</Label>
                <Select
                  value={formData.employmentStatus}
                  onValueChange={(value) =>
                    handleInputChange("employmentStatus", value)
                  }
                >
                  <SelectTrigger id="employmentStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              employee record and all associated shift logs.
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
