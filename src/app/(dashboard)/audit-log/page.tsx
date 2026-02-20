"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { FilterPills } from "@/components/ui/filter-pills"
import { cn } from "@/lib/utils"
import { RefreshCw, History, FileText, ChevronLeft, ChevronRight } from "lucide-react"

interface AuditLog {
  id: number
  changeId: string
  ingredientId: number
  ingredientName: string
  unit: string
  field: string
  oldValue: string
  newValue: string
  change: string | null
  source: string
  reason: string | null
  reasonNote: string | null
  userId: number
  userName: string
  createdAt: string
}

interface AuditData {
  page: number
  limit: number
  total: number
  totalPages: number
  filters: {
    sources: string[]
    users: Array<{ id: number; name: string }>
  }
  logs: AuditLog[]
}

const sourceLabels: Record<string, { label: string; color: string }> = {
  manual_edit: { label: "Manual Edit", color: "bg-blue-100 text-blue-800" },
  sale: { label: "Sale", color: "bg-green-100 text-green-800" },
  inventory_count: { label: "Inventory Count", color: "bg-purple-100 text-purple-800" },
  restock: { label: "Restock", color: "bg-orange-100 text-orange-800" },
  import: { label: "Import", color: "bg-muted text-foreground" },
}

const columns: DataTableColumn<AuditLog>[] = [
  {
    id: "timestamp",
    header: "Timestamp",
    cell: (log) => format(new Date(log.createdAt), "MMM d, yyyy h:mm a"),
    priority: 0,
    sortable: false,
  },
  {
    id: "user",
    header: "User",
    cell: (log) => log.userName,
    priority: 1,
  },
  {
    id: "ingredient",
    header: "Ingredient",
    cell: (log) => <span className="font-medium">{log.ingredientName}</span>,
    priority: 0,
  },
  {
    id: "change",
    header: "Change",
    cell: (log) => {
      const delta = parseFloat(log.change || "0")
      const color = delta > 0 ? "text-status-ok" : delta < 0 ? "text-status-critical" : ""
      return (
        <span className={cn("font-mono tabular-nums", color)}>
          {delta > 0 ? "+" : ""}{delta} {log.unit}
        </span>
      )
    },
    priority: 0,
    align: "right",
  },
  {
    id: "source",
    header: "Source",
    cell: (log) => {
      const info = sourceLabels[log.source]
      return (
        <Badge variant="outline" className={info?.color}>
          {info?.label || log.source}
        </Badge>
      )
    },
    priority: 1,
  },
  {
    id: "reason",
    header: "Reason",
    cell: (log) => (
      <div className="max-w-[200px] truncate text-muted-foreground text-sm">
        {log.reason
          ? `${log.reason}${log.reasonNote ? `: ${log.reasonNote}` : ""}`
          : log.reasonNote || "-"}
      </div>
    ),
    priority: 2,
  },
]

export default function AuditLogPage() {
  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Filters
  const [source, setSource] = useState("")
  const [userId, setUserId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", "50")
      if (source && source !== "all") params.append("source", source)
      if (userId && userId !== "all") params.append("userId", userId)
      if (dateFrom) params.append("dateFrom", dateFrom)
      if (dateTo) params.append("dateTo", dateTo)

      const res = await fetch(`/api/audit-log?${params}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch audit log:", error)
    } finally {
      setLoading(false)
    }
  }, [page, source, userId, dateFrom, dateTo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function clearFilters() {
    setSource("")
    setUserId("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const hasFilters = (source && source !== "all") || (userId && userId !== "all") || dateFrom || dateTo

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">Track all inventory changes</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Source FilterPills */}
      <FilterPills
        options={
          data?.filters.sources.map((s) => ({
            label: sourceLabels[s]?.label || s,
            value: s,
          })) || []
        }
        value={source || null}
        onChange={(val) => {
          setSource(val || "")
          setPage(1)
        }}
        ariaLabel="Filter by source"
      />

      {/* Date and User filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>User</Label>
          <Select value={userId} onValueChange={(val) => { setUserId(val); setPage(1) }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {data?.filters.users.map((u) => (
                <SelectItem key={u.id} value={u.id.toString()}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>From Date</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          />
        </div>

        <div className="space-y-2">
          <Label>To Date</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          />
        </div>

        {hasFilters && (
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Summary */}
      {data && !loading && (
        <p className="text-sm text-muted-foreground">
          Showing {data.logs.length} of {data.total} entries
        </p>
      )}

      {/* DataTable */}
      <DataTable<AuditLog>
        columns={columns}
        data={data?.logs || []}
        rowKey={(log) => log.id}
        loading={loading}
        emptyIcon={<FileText className="h-10 w-10" />}
        emptyTitle={hasFilters ? "No entries match your filters" : "No activity recorded yet"}
        emptyDescription={
          hasFilters
            ? undefined
            : "Inventory changes will be logged here automatically."
        }
        emptyAction={
          hasFilters ? (
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : undefined
        }
        pageSize={9999}
      />

      {/* Server-side pagination */}
      {data && data.totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
