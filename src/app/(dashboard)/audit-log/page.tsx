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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Timeline, TimelineItem, TimelineTimestamp, TimelineContent } from "@/components/ui/timeline"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DateRangePicker, type DateRangePreset } from "@/components/ui/date-range-picker"
import { cn } from "@/lib/utils"
import { getDateRange, DATE_RANGE_OPTIONS } from "@/lib/date-ranges"
import { generatePageNumbers } from "@/lib/pagination-utils"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { RefreshCw, History, FileText, ChevronLeft, ChevronRight, TableIcon, ListIcon } from "lucide-react"

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
  manual_edit: { label: "Manual Edit", color: "bg-status-info/15 text-status-info" },
  sale: { label: "Sale", color: "bg-status-ok/15 text-status-ok" },
  inventory_count: { label: "Inventory Count", color: "bg-accent text-accent-foreground" },
  restock: { label: "Restock", color: "bg-status-warning/15 text-status-warning" },
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
    cell: (log) => {
      const initials = log.userName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
      return (
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span>{log.userName}</span>
        </div>
      )
    },
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

function getTimelineStatus(source: string): "ok" | "warning" | "critical" | "info" | "neutral" {
  switch (source) {
    case "sale": return "ok"
    case "restock": return "warning"
    case "manual_edit": return "info"
    case "inventory_count": return "neutral"
    default: return "neutral"
  }
}

function AuditTimeline({ logs, loading }: { logs: AuditLog[]; loading: boolean }) {
  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
  }

  if (logs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No entries to display.
      </div>
    )
  }

  // Group by day
  const grouped: Record<string, AuditLog[]> = {}
  for (const log of logs) {
    const day = format(new Date(log.createdAt), "MMM d, yyyy")
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(log)
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([day, dayLogs]) => (
        <div key={day}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{day}</h3>
          <Timeline>
            {dayLogs.map((log) => {
              const delta = parseFloat(log.change || "0")
              const color = delta > 0 ? "text-status-ok" : delta < 0 ? "text-status-critical" : ""
              const initials = log.userName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)

              return (
                <TimelineItem key={log.id} status={getTimelineStatus(log.source)}>
                  <div className="flex items-start justify-between gap-2">
                    <TimelineContent>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Avatar size="sm">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{log.userName}</span>
                        <Badge variant="outline" className={cn("text-[10px]", sourceLabels[log.source]?.color)}>
                          {sourceLabels[log.source]?.label || log.source}
                        </Badge>
                      </div>
                      <p className="text-sm">
                        <span className="font-medium">{log.ingredientName}</span>
                        {" "}
                        <span className={cn("font-mono tabular-nums", color)}>
                          {delta > 0 ? "+" : ""}{delta} {log.unit}
                        </span>
                        {log.reason && (
                          <span className="text-muted-foreground"> — {log.reason}{log.reasonNote ? `: ${log.reasonNote}` : ""}</span>
                        )}
                      </p>
                    </TimelineContent>
                    <TimelineTimestamp>
                      {format(new Date(log.createdAt), "h:mm a")}
                    </TimelineTimestamp>
                  </div>
                </TimelineItem>
              )
            })}
          </Timeline>
        </div>
      ))}
    </div>
  )
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table")

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

  const datePresets: DateRangePreset[] = DATE_RANGE_OPTIONS.map((label) => ({
    label,
    getValue: () => {
      const range = getDateRange(label)
      return { from: range.start, to: range.end }
    },
  }))

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

      {/* Source filter + View toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={source}
          onValueChange={(v) => {
            setSource(v || "")
            setPage(1)
          }}
          aria-label="Filter by source"
        >
          {(data?.filters.sources || []).map((s) => (
            <ToggleGroupItem key={s} value={s}>
              {sourceLabels[s]?.label || s}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={viewMode}
          onValueChange={(v) => { if (v) setViewMode(v as "table" | "timeline") }}
          aria-label="View mode"
        >
          <ToggleGroupItem value="table" aria-label="Table view">
            <TableIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="timeline" aria-label="Timeline view">
            <ListIcon className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Date and User filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>User</Label>
          <Select value={userId} onValueChange={(val) => { setUserId(val); setPage(1) }}>
            <SelectTrigger className="w-[180px]" aria-label="Filter by user">
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
          <Label>Date Range</Label>
          <DateRangePicker
            from={dateFrom ? new Date(dateFrom + "T00:00:00") : undefined}
            to={dateTo ? new Date(dateTo + "T00:00:00") : undefined}
            onChange={({ from, to }) => {
              setDateFrom(from ? format(from, "yyyy-MM-dd") : "")
              setDateTo(to ? format(to, "yyyy-MM-dd") : "")
              setPage(1)
            }}
            presets={datePresets}
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

      {/* Data view */}
      {viewMode === "table" ? (
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
      ) : (
        <AuditTimeline logs={data?.logs || []} loading={loading} />
      )}

      {/* Server-side pagination */}
      {data && data.totalPages > 1 && !loading && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-disabled={page === 1}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {generatePageNumbers(page, data.totalPages).map((item, i) =>
              item === "..." ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    isActive={item === page}
                    onClick={() => setPage(item)}
                    className="cursor-pointer"
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                aria-disabled={page === data.totalPages}
                className={page === data.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
