"use client"

import { useState, useEffect, useCallback, Suspense, lazy } from "react"
import { useSearchParams } from "next/navigation"
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
import { Plus, LinkIcon } from "lucide-react"
import { toast } from "sonner"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { useIsMobile } from "@/hooks/use-mobile"
import { getValidNextStates } from "@/lib/employee-status"
import { WorkspaceTabs, type WorkspaceTab } from "@/components/employees/workspace/workspace-tabs"
import { MobileBottomNav } from "@/components/employees/workspace/mobile-bottom-nav"

// Lazy-load tab components for code splitting
const TodayTab = lazy(() => import("@/components/employees/workspace/today-tab"))
const TeamTab = lazy(() => import("@/components/employees/workspace/team-tab"))
const ScheduleTab = lazy(() => import("@/components/employees/workspace/schedule-tab"))
const TasksTab = lazy(() => import("@/components/employees/workspace/tasks-tab"))
const PayrollTab = lazy(() => import("@/components/employees/workspace/payroll-tab"))
const ReportsTab = lazy(() => import("@/components/employees/workspace/reports-tab"))

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

interface SimpleUser {
  id: number
  username: string
  fullname: string
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

function EmployeesPageContent() {
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const activeTab = (searchParams.get("tab") as WorkspaceTab) || "today"

  // Employee CRUD state (preserved from original page)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState<EmployeeFormData>(emptyFormData)
  const [allUsers, setAllUsers] = useState<SimpleUser[]>([])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees")
      if (res.ok) setEmployees(await res.json())
    } catch {
      // Non-critical
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) setAllUsers(await res.json())
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => {
    fetchEmployees()
    fetchUsers()
  }, [fetchEmployees, fetchUsers])

  // Users available for linking: not already linked to another employee
  const linkedUserIds = new Set(
    employees
      .filter((e) => e.userId != null && e.id !== editEmployee?.id)
      .map((e) => e.userId!)
  )
  const userOptions: ComboboxOption<number>[] = allUsers
    .filter((u) => !linkedUserIds.has(u.id))
    .map((u) => ({ value: u.id, label: `${u.fullname} (${u.username})` }))

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

  const tabFallback = (
    <div className="flex items-center justify-center h-48">
      <div className="text-sm text-muted-foreground">Loading...</div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 md:p-6 pb-0">
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
            <WorkspaceTabs activeTab={activeTab} />
            <Button onClick={() => openForm()}>
              <Plus className="h-4 w-4 mr-2" /> Add Employee
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <Suspense fallback={tabFallback}>
          {activeTab === "today" && <TodayTab />}
          {activeTab === "team" && (
            <TeamTab
              employees={employees}
              onEdit={openForm}
              onDelete={(id) => setDeleteId(id)}
              onRefresh={fetchEmployees}
            />
          )}
          {activeTab === "schedule" && <ScheduleTab />}
          {activeTab === "tasks" && <TasksTab />}
          {activeTab === "payroll" && <PayrollTab />}
          {activeTab === "reports" && <ReportsTab />}
        </Suspense>
      </div>

      {/* Mobile Bottom Nav */}
      {isMobile && <MobileBottomNav activeTab={activeTab} />}

      {/* Add/Edit Employee Dialog (preserved from original) */}
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
                    <SelectItem value={editEmployee.employmentStatus} disabled>
                      {editEmployee.employmentStatus} (current)
                    </SelectItem>
                    {getValidNextStates(editEmployee.employmentStatus).map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {allUsers.length > 0 && (
              <div className="space-y-2">
                <Label>Link to User Account</Label>
                <Combobox<number>
                  options={userOptions}
                  value={formData.userId ? parseInt(formData.userId) : null}
                  onChange={(val) =>
                    handleInputChange("userId", val ? String(val) : "")
                  }
                  placeholder="None (no login access)"
                  searchPlaceholder="Search users..."
                  emptyMessage="No available users."
                  icon={<LinkIcon className="h-4 w-4" />}
                />
                <p className="text-xs text-muted-foreground">
                  Link this employee to a user account for POS login access.
                </p>
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

      {/* Delete Confirmation (preserved from original) */}
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

export default function EmployeesPage() {
  return (
    <Suspense>
      <EmployeesPageContent />
    </Suspense>
  )
}
