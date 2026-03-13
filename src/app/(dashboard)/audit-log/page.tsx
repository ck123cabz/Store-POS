"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
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
import { RefreshCw, History, FileText, TableIcon, ListIcon } from "lucide-react"

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface IngredientLog {
  logType: "ingredient"
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

interface GeneralLog {
  logType: "general"
  id: number
  entity: string
  entityId: number | null
  action: string
  changes: Record<string, { old: unknown; new: unknown }> | null
  summary: string
  userId: number | null
  userName: string | null
  createdAt: string
}

type AuditLog = IngredientLog | GeneralLog

interface AuditData {
  page: number
  limit: number
  total: number
  totalPages: number
  logType: "all" | "ingredient" | "general"
  filters: {
    sources?: string[]
    entities?: string[]
    users: Array<{ id: number; name: string }>
  }
  logs: AuditLog[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// Labels & Colors
// ═══════════════════════════════════════════════════════════════════════════════

const sourceLabels: Record<string, { label: string; color: string }> = {
  manual_edit: { label: "Manual Edit", color: "bg-status-info/15 text-status-info" },
  sale: { label: "Sale", color: "bg-status-ok/15 text-status-ok" },
  inventory_count: { label: "Inventory Count", color: "bg-accent text-accent-foreground" },
  restock: { label: "Restock", color: "bg-status-warning/15 text-status-warning" },
  production: { label: "Production", color: "bg-primary/10 text-primary" },
  void_reversal: { label: "Void Reversal", color: "bg-status-critical/15 text-status-critical" },
  import: { label: "Import", color: "bg-muted text-foreground" },
}

const actionLabels: Record<string, { label: string; color: string }> = {
  create: { label: "Create", color: "bg-status-ok/15 text-status-ok" },
  update: { label: "Update", color: "bg-status-info/15 text-status-info" },
  delete: { label: "Delete", color: "bg-status-critical/15 text-status-critical" },
  void: { label: "Void", color: "bg-status-critical/15 text-status-critical" },
  cancel: { label: "Cancel", color: "bg-status-warning/15 text-status-warning" },
  confirm: { label: "Confirm", color: "bg-status-ok/15 text-status-ok" },
  restock: { label: "Restock", color: "bg-status-warning/15 text-status-warning" },
  produce: { label: "Produce", color: "bg-primary/10 text-primary" },
  reorder: { label: "Reorder", color: "bg-accent text-accent-foreground" },
  settle_tab: { label: "Tab Settlement", color: "bg-status-warning/15 text-status-warning" },
  inventory_count: { label: "Inventory Count", color: "bg-accent text-accent-foreground" },
  status_change: { label: "Status Change", color: "bg-status-info/15 text-status-info" },
}

const entityLabels: Record<string, string> = {
  product: "Product",
  category: "Category",
  user: "User",
  customer: "Customer",
  transaction: "Transaction",
  ingredient: "Ingredient",
  purchase_variant: "Variant",
  unit_alias: "Unit Alias",
  recipe: "Recipe",
  production_recipe: "Production Recipe",
  setting: "Settings",
  waste_log: "Waste Log",
  kitchen_order: "Kitchen Order",
  vendor: "Vendor",
  task: "Task",
  inventory_count: "Inventory Count",
  inventory_count_draft: "Count Draft",
}

// ═══════════════════════════════════════════════════════════════════════════════
// Ingredient Table Columns
// ═══════════════════════════════════════════════════════════════════════════════

const ingredientColumns: DataTableColumn<IngredientLog>[] = [
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

// ═══════════════════════════════════════════════════════════════════════════════
// General Table Columns
// ═══════════════════════════════════════════════════════════════════════════════

const generalColumns: DataTableColumn<GeneralLog>[] = [
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
      if (!log.userName) return <span className="text-muted-foreground">System</span>
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
    id: "entity",
    header: "Entity",
    cell: (log) => (
      <Badge variant="secondary" className="font-normal">
        {entityLabels[log.entity] || log.entity}
      </Badge>
    ),
    priority: 0,
  },
  {
    id: "action",
    header: "Action",
    cell: (log) => {
      const info = actionLabels[log.action]
      return (
        <Badge variant="outline" className={info?.color}>
          {info?.label || log.action}
        </Badge>
      )
    },
    priority: 0,
  },
  {
    id: "summary",
    header: "Summary",
    cell: (log) => (
      <div className="max-w-[300px] truncate text-sm">
        {log.summary}
      </div>
    ),
    priority: 0,
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// Mixed Table Columns (all logs)
// ═══════════════════════════════════════════════════════════════════════════════

const mixedColumns: DataTableColumn<AuditLog>[] = [
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
      const name = log.userName
      if (!name) return <span className="text-muted-foreground">System</span>
      const initials = name
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
          <span>{name}</span>
        </div>
      )
    },
    priority: 1,
  },
  {
    id: "type",
    header: "Type",
    cell: (log) => {
      if (log.logType === "ingredient") {
        const info = sourceLabels[log.source]
        return (
          <Badge variant="outline" className={info?.color}>
            {info?.label || log.source}
          </Badge>
        )
      }
      const info = actionLabels[log.action]
      return (
        <Badge variant="outline" className={info?.color}>
          {entityLabels[log.entity] || log.entity}: {info?.label || log.action}
        </Badge>
      )
    },
    priority: 0,
  },
  {
    id: "detail",
    header: "Detail",
    cell: (log) => {
      if (log.logType === "ingredient") {
        const delta = parseFloat(log.change || "0")
        const color = delta > 0 ? "text-status-ok" : delta < 0 ? "text-status-critical" : ""
        return (
          <div className="text-sm">
            <span className="font-medium">{log.ingredientName}</span>{" "}
            <span className={cn("font-mono tabular-nums", color)}>
              {delta > 0 ? "+" : ""}{delta} {log.unit}
            </span>
          </div>
        )
      }
      return (
        <div className="max-w-[300px] truncate text-sm">
          {log.summary}
        </div>
      )
    },
    priority: 0,
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// Timeline Components
// ═══════════════════════════════════════════════════════════════════════════════

function getTimelineStatus(log: AuditLog): "ok" | "warning" | "critical" | "info" | "neutral" {
  if (log.logType === "ingredient") {
    switch (log.source) {
      case "sale": return "ok"
      case "restock": return "warning"
      case "manual_edit": return "info"
      case "inventory_count": return "neutral"
      case "void_reversal": return "critical"
      case "production": return "info"
      default: return "neutral"
    }
  }
  switch (log.action) {
    case "create": return "ok"
    case "delete": case "void": case "cancel": return "critical"
    case "update": case "status_change": return "info"
    case "restock": case "settle_tab": return "warning"
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
              const name = log.userName || "System"
              const initials = name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)

              return (
                <TimelineItem key={`${log.logType}-${log.id}`} status={getTimelineStatus(log)}>
                  <div className="flex items-start justify-between gap-2">
                    <TimelineContent>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Avatar size="sm">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{name}</span>
                        {log.logType === "ingredient" ? (
                          <Badge variant="outline" className={cn("text-[10px]", sourceLabels[log.source]?.color)}>
                            {sourceLabels[log.source]?.label || log.source}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={cn("text-[10px]", actionLabels[log.action]?.color)}>
                            {entityLabels[log.entity] || log.entity}: {actionLabels[log.action]?.label || log.action}
                          </Badge>
                        )}
                      </div>
                      {log.logType === "ingredient" ? (
                        <p className="text-sm">
                          <span className="font-medium">{log.ingredientName}</span>
                          {" "}
                          <span className={cn(
                            "font-mono tabular-nums",
                            parseFloat(log.change || "0") > 0 ? "text-status-ok" : parseFloat(log.change || "0") < 0 ? "text-status-critical" : ""
                          )}>
                            {parseFloat(log.change || "0") > 0 ? "+" : ""}{parseFloat(log.change || "0")} {log.unit}
                          </span>
                          {log.reason && (
                            <span className="text-muted-foreground"> — {log.reason}{log.reasonNote ? `: ${log.reasonNote}` : ""}</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">{log.summary}</p>
                      )}
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

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════

export default function AuditLogPage() {
  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table")

  // Log type filter
  const [logType, setLogType] = useState<"all" | "ingredient" | "general">("all")

  // Filters
  const [source, setSource] = useState("")
  const [entity, setEntity] = useState("")
  const [userId, setUserId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", "50")
      if (logType !== "all") params.append("logType", logType)
      if (source && source !== "all") params.append("source", source)
      if (entity && entity !== "all") params.append("entity", entity)
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
  }, [page, logType, source, entity, userId, dateFrom, dateTo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function clearFilters() {
    setSource("")
    setEntity("")
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

  const hasFilters = (source && source !== "all") || (entity && entity !== "all") || (userId && userId !== "all") || dateFrom || dateTo

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6" />
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">Track all changes across the system</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Log type tabs + View toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={logType}
          onValueChange={(v) => {
            if (v) {
              setLogType(v as "all" | "ingredient" | "general")
              setSource("")
              setEntity("")
              setPage(1)
            }
          }}
          aria-label="Log type"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="ingredient">Inventory</ToggleGroupItem>
          <ToggleGroupItem value="general">General</ToggleGroupItem>
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

      {/* Source/Entity filter pills */}
      {logType === "ingredient" && (data?.filters.sources || []).length > 0 && (
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
      )}

      {logType === "general" && (data?.filters.entities || []).length > 0 && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={entity}
          onValueChange={(v) => {
            setEntity(v || "")
            setPage(1)
          }}
          aria-label="Filter by entity"
        >
          {(data?.filters.entities || []).map((e) => (
            <ToggleGroupItem key={e} value={e}>
              {entityLabels[e] || e}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

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
        <>
          {logType === "ingredient" ? (
            <DataTable<IngredientLog>
              columns={ingredientColumns}
              data={(data?.logs || []).filter((l): l is IngredientLog => l.logType === "ingredient")}
              rowKey={(log) => log.id}
              loading={loading}
              emptyIcon={<FileText className="h-10 w-10" />}
              emptyTitle={hasFilters ? "No entries match your filters" : "No inventory changes recorded yet"}
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
          ) : logType === "general" ? (
            <DataTable<GeneralLog>
              columns={generalColumns}
              data={(data?.logs || []).filter((l): l is GeneralLog => l.logType === "general")}
              rowKey={(log) => log.id}
              loading={loading}
              emptyIcon={<FileText className="h-10 w-10" />}
              emptyTitle={hasFilters ? "No entries match your filters" : "No activity recorded yet"}
              emptyDescription={
                hasFilters
                  ? undefined
                  : "All system changes will be logged here automatically."
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
            <DataTable<AuditLog>
              columns={mixedColumns}
              data={data?.logs || []}
              rowKey={(log) => `${log.logType}-${log.id}`}
              loading={loading}
              emptyIcon={<FileText className="h-10 w-10" />}
              emptyTitle={hasFilters ? "No entries match your filters" : "No activity recorded yet"}
              emptyDescription={
                hasFilters
                  ? undefined
                  : "All changes will be logged here automatically."
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
          )}
        </>
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
