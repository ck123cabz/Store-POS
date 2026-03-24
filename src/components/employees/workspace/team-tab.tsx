"use client"

import { useState, useEffect, useCallback, lazy, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { Card } from "@/components/ui/card"
import { useSettings } from "@/hooks/use-settings"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatCurrency } from "@/lib/format-currency"
import { Briefcase, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const TeamDetailPanel = lazy(() => import("./team-detail-panel"))

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

interface TeamTabProps {
  employees: Employee[]
  onEdit: (employee: Employee) => void
  onDelete: (id: number) => void
  onRefresh: () => void
}

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

function getStatusDotColor(status: string) {
  switch (status) {
    case "Active": return "bg-status-ok"
    case "Inactive": return "bg-muted-foreground"
    case "Terminated": return "bg-status-critical"
    default: return "bg-muted-foreground"
  }
}

export default function TeamTab({ employees, onEdit, onDelete, onRefresh }: TeamTabProps) {
  const { currencySymbol } = useSettings()
  const isMobile = useIsMobile()
  const searchParams = useSearchParams()
  const router = useRouter()
  const selectedId = searchParams.get("id") ? parseInt(searchParams.get("id")!) : null

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("Active")

  const fmtCurrency = (v: string | number | null | undefined) => formatCurrency(v, currencySymbol)

  const selectedEmployee = selectedId
    ? employees.find((e) => e.id === selectedId) || null
    : null

  function selectEmployee(id: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("id", id.toString())
    router.replace(`/employees?${params.toString()}`)
  }

  function clearSelection() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("id")
    router.replace(`/employees?${params.toString()}`)
  }

  const filteredEmployees = employees.filter((e) => {
    if (statusFilter !== "All" && e.employmentStatus !== statusFilter) return false
    if (!search) return true
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase()
    return fullName.includes(search.toLowerCase())
  })

  // Mobile: full-screen detail when employee selected
  if (isMobile && selectedEmployee) {
    return (
      <div className="flex flex-col h-full -m-4">
        <div className="flex items-center gap-2 p-3 border-b border-border/60">
          <Button size="icon" variant="ghost" onClick={clearSelection}>
            <ArrowLeft className="size-4" />
          </Button>
          <span className="font-medium text-sm">
            {selectedEmployee.firstName} {selectedEmployee.lastName}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading...</div>}>
            <TeamDetailPanel
              employee={selectedEmployee}
              onEdit={() => onEdit(selectedEmployee)}
            />
          </Suspense>
        </div>
      </div>
    )
  }

  // Desktop split view or full-width table
  const columns: DataTableColumn<Employee>[] = [
    {
      id: "name",
      header: "Name",
      cell: (e) => (
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback>{getInitials(e.firstName, e.lastName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{e.firstName} {e.lastName}</span>
            {e.email && <span className="text-xs text-muted-foreground">{e.email}</span>}
          </div>
        </div>
      ),
      priority: 0,
      sortable: true,
    },
    { id: "position", header: "Position", cell: (e) => e.position || "\u2014", priority: 1 },
    { id: "status", header: "Status", cell: (e) => getStatusBadge(e.employmentStatus), priority: 0 },
    {
      id: "hourlyRate",
      header: "Rate/hr",
      cell: (e) => <span className="font-mono tabular-nums">{fmtCurrency(e.hourlyRate)}</span>,
      priority: 1,
      align: "right",
    },
  ]

  return (
    <div className={cn("flex gap-0 h-full", selectedEmployee && !isMobile && "")}>
      {/* Employee list — compressed when detail is open */}
      <div className={cn(
        "flex flex-col",
        selectedEmployee && !isMobile ? "w-[260px] shrink-0 border-r border-border/60" : "flex-1"
      )}>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(val) => { if (val) setStatusFilter(val) }}
            size="sm"
            variant="outline"
          >
            <ToggleGroupItem value="Active">Active</ToggleGroupItem>
            <ToggleGroupItem value="Inactive">Inactive</ToggleGroupItem>
            <ToggleGroupItem value="Terminated">Terminated</ToggleGroupItem>
            <ToggleGroupItem value="All">All</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Full table or compressed list */}
        {selectedEmployee && !isMobile ? (
          // Compressed list
          <div className="overflow-y-auto flex-1">
            {filteredEmployees.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => selectEmployee(e.id)}
                className={cn(
                  "flex items-center gap-2 w-full p-2.5 text-left transition-colors",
                  e.id === selectedId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/40"
                )}
              >
                <Avatar size="sm">
                  <AvatarFallback>{getInitials(e.firstName, e.lastName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {e.firstName} {e.lastName}
                  </span>
                </div>
                <span className={cn("size-2 rounded-full shrink-0", getStatusDotColor(e.employmentStatus))} />
              </button>
            ))}
          </div>
        ) : (
          // Full table
          <DataTable
            columns={columns}
            data={filteredEmployees}
            rowKey={(e) => e.id}
            onRowClick={(e) => selectEmployee(e.id)}
            emptyIcon={<Briefcase className="h-10 w-10" />}
            emptyTitle="No employees found"
            emptyDescription="Add your first employee to get started."
            mobileCardRender={(e) => (
              <Card className="p-3 shadow-none">
                <div className="flex items-center gap-3">
                  <Avatar size="sm">
                    <AvatarFallback>{getInitials(e.firstName, e.lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{e.firstName} {e.lastName}</span>
                      {getStatusBadge(e.employmentStatus)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {e.position || "No position"}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono tabular-nums mt-0.5">
                      {fmtCurrency(e.hourlyRate)}/hr
                    </div>
                  </div>
                </div>
              </Card>
            )}
          />
        )}
      </div>

      {/* Detail panel (desktop only) */}
      {selectedEmployee && !isMobile && (
        <div className="flex-1 min-w-0 overflow-hidden">
          <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading...</div>}>
            <TeamDetailPanel
              employee={selectedEmployee}
              onEdit={() => onEdit(selectedEmployee)}
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}
