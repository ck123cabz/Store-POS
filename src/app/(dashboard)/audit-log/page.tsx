"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RefreshCw, Search, History, ChevronLeft, ChevronRight } from "lucide-react"

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

  function handleSearch() {
    setPage(1)
    fetchLogs()
  }

  function clearFilters() {
    setSource("")
    setUserId("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  function getSourceBadge(src: string) {
    const info = sourceLabels[src] || { label: src, color: "bg-muted text-foreground" }
    return (
      <Badge variant="outline" className={info.color}>
        {info.label}
      </Badge>
    )
  }

  function formatChange(log: AuditLog): string {
    if (log.field === "quantity" && log.change) {
      const change = parseFloat(log.change)
      return change >= 0 ? `+${change} ${log.unit}` : `${change} ${log.unit}`
    }
    return `${log.oldValue} -> ${log.newValue}`
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Audit Log
          </h1>
          <p className="text-muted-foreground text-sm">Track all inventory changes</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {data?.filters.sources.map((s) => (
                    <SelectItem key={s} value={s}>
                      {sourceLabels[s]?.label || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>User</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
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
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {data && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {data.logs.length} of {data.total} entries
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead className="hidden sm:table-cell">Source</TableHead>
                  <TableHead className="hidden md:table-cell">Reason</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell className="font-medium">{log.ingredientName}</TableCell>
                    <TableCell>
                      <span
                        className={
                          log.change && parseFloat(log.change) < 0
                            ? "text-red-600"
                            : log.change && parseFloat(log.change) > 0
                            ? "text-green-600"
                            : ""
                        }
                      >
                        {formatChange(log)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{getSourceBadge(log.source)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        {log.reason && (
                          <span className="text-sm">{log.reason}</span>
                        )}
                        {log.reasonNote && (
                          <p className="text-xs text-muted-foreground">{log.reasonNote}</p>
                        )}
                        {!log.reason && !log.reasonNote && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{log.userName}</TableCell>
                  </TableRow>
                ))}
                {data?.logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
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
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
