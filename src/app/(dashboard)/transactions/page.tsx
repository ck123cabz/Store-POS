"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getDateRange, formatDateRangeLabel, type DateRangeType } from "@/lib/date-ranges"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, Search, TrendingUp, DollarSign, Clock, Flame, RefreshCw, Ban, AlertTriangle } from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"
import { useSettings } from "@/hooks/use-settings"
import { useSession } from "next-auth/react"
import { VALID_VOID_REASONS } from "@/lib/void-constants"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

interface TransactionItem {
  id: number
  productName: string
  price: string
  quantity: number
}

interface Transaction {
  id: number
  orderNumber: number
  total: string
  subtotal: string
  discount: string
  taxAmount: string
  status: number
  paymentType: string
  paidAmount: string
  changeAmount: string
  // 002-pos-mobile-payments fields
  paymentStatus: string | null
  paymentInfo: string | null
  gcashPhotoPath: string | null
  createdAt: string
  tillNumber: number
  refNumber: string
  customer: { id: number; name: string } | null
  user: { id: number; fullname: string }
  items: TransactionItem[]
  // 003-transaction-fixes: Void fields
  isVoided: boolean
  voidedAt: string | null
  voidedByName: string | null
  voidReason: string | null
}

interface User {
  id: number
  fullname: string
}

interface TodayData {
  totalRevenue: number
  transactions: number
  avgTicket: number
  totalItems: number
  peakHour: {
    hour: number
    label: string
    transactions: number
    revenue: number
  }
  daypartBreakdown: Array<{
    daypart: string
    count: number
    total: number
  }>
}

interface HeatmapCell {
  day: number
  dayName: string
  hour: number
  transactions: number
  revenue: number
}

interface HeatmapData {
  data: HeatmapCell[]
  peakTimes: HeatmapCell[]
  maxTransactions: number
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null)
  const [todayData, setTodayData] = useState<TodayData | null>(null)
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null)
  const [activeTab, setActiveTab] = useState("list")

  // 003-transaction-fixes: Use settings for currency symbol
  const { currencySymbol } = useSettings()

  // 003-transaction-fixes: Session for void permission
  const { data: session } = useSession()

  // 003-transaction-fixes: Void modal state
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [voidReason, setVoidReason] = useState("")
  const [customVoidReason, setCustomVoidReason] = useState("")
  const [voidError, setVoidError] = useState<string | null>(null)
  const [voidLoading, setVoidLoading] = useState(false)

  // Filters
  const [status, setStatus] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [till, setTill] = useState<string>("")
  // 003-transaction-fixes: Include voided filter
  const [includeVoided, setIncludeVoided] = useState(false)

  // T069-T080: Quick filter state
  const [activeQuickFilter, setActiveQuickFilter] = useState<DateRangeType | null>(null)
  const [isQuickFilterLoading, setIsQuickFilterLoading] = useState(false)
  const [_quickFilterError, setQuickFilterError] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // T071: Quick filter date range options
  const quickFilterOptions: DateRangeType[] = ["Today", "Yesterday", "This Week", "Last Week", "This Month"]

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status && status !== "all") params.append("status", status)
      if (userId && userId !== "all") params.append("userId", userId)
      if (dateFrom) params.append("dateFrom", dateFrom)
      if (dateTo) params.append("dateTo", dateTo)
      if (till) params.append("till", till)
      // 003-transaction-fixes: Include voided filter
      if (includeVoided) params.append("includeVoided", "true")

      const res = await fetch(`/api/transactions?${params}`)
      if (res.ok) {
        setTransactions(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setLoading(false)
    }
  }, [status, userId, dateFrom, dateTo, till, includeVoided])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        setUsers(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }, [])

  const fetchTodayData = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions/today")
      if (res.ok) {
        setTodayData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch today's data:", error)
    }
  }, [])

  const fetchHeatmapData = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions/heatmap?days=30")
      if (res.ok) {
        setHeatmapData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch heatmap data:", error)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
    fetchUsers()
    fetchTodayData()
    fetchHeatmapData()
  }, [fetchTransactions, fetchUsers, fetchTodayData, fetchHeatmapData])

  function getStatusBadge(tx: Transaction) {
    if (tx.status === 1) {
      return <Badge variant="default">Completed</Badge>
    }
    if (tx.refNumber) {
      return <Badge variant="secondary">On Hold</Badge>
    }
    return <Badge variant="outline">Pending</Badge>
  }

  // 003-transaction-fixes: Helper to format currency with settings symbol
  const fmtCurrency = (value: string | number | null | undefined) =>
    formatCurrency(value, currencySymbol)

  // T021: Format payment display with details (002-pos-mobile-payments)
  function formatPaymentDisplay(tx: Transaction): { label: string; detail?: string; status?: "pending" | "confirmed" } {
    if (!tx.paymentType) return { label: "-" }

    switch (tx.paymentType) {
      case "Cash": {
        const change = parseFloat(tx.changeAmount || "0")
        if (change > 0) {
          return { label: "Cash", detail: `Change: ${fmtCurrency(change)}` }
        }
        return { label: "Cash" }
      }
      case "GCash": {
        const isPending = tx.paymentStatus === "pending"
        return {
          label: "GCash",
          detail: tx.paymentInfo ? `Ref: ${tx.paymentInfo.slice(0, 10)}...` : undefined,
          status: isPending ? "pending" : "confirmed",
        }
      }
      case "Tab":
        return { label: "Tab", detail: tx.customer?.name }
      case "Split": {
        try {
          const splitData = JSON.parse(tx.paymentInfo || "{}")
          const components = splitData.components || []
          const methods = components.map((c: { method: string }) => c.method).join("+")
          return { label: "Split", detail: methods || undefined }
        } catch {
          return { label: "Split" }
        }
      }
      default:
        return { label: tx.paymentType }
    }
  }

  function handleSearch() {
    fetchTransactions()
  }

  // 003-transaction-fixes: Handle void transaction
  async function handleVoidTransaction() {
    if (!viewTransaction) return

    if (!voidReason) {
      setVoidError("Please select a reason")
      return
    }

    if (voidReason === "Other" && !customVoidReason.trim()) {
      setVoidError("Please provide a custom reason")
      return
    }

    setVoidLoading(true)
    setVoidError(null)

    try {
      const res = await fetch(`/api/transactions/${viewTransaction.id}/void`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: voidReason,
          customReason: voidReason === "Other" ? customVoidReason : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to void transaction")
      }

      const voidedTx = await res.json()

      // Update local state
      setTransactions(transactions.map(tx =>
        tx.id === voidedTx.id ? { ...tx, ...voidedTx } : tx
      ))
      setViewTransaction({ ...viewTransaction, ...voidedTx })

      // Close void modal
      setShowVoidModal(false)
      setVoidReason("")
      setCustomVoidReason("")

      // Refresh today's data (revenue totals)
      fetchTodayData()
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : "Failed to void transaction")
    } finally {
      setVoidLoading(false)
    }
  }

  function clearFilters() {
    setStatus("")
    setUserId("")
    setDateFrom("")
    setDateTo("")
    setTill("")
    setIncludeVoided(false)
    setActiveQuickFilter(null)
  }

  // T069-T080: Enhanced quick filter handler with debounce, toggle, and optimistic UI
  async function handleQuickFilterClick(filterType: DateRangeType) {
    // T073: Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // T078: Same filter clicked - toggle off (EC-18)
    if (activeQuickFilter === filterType) {
      setActiveQuickFilter(null)
      setDateFrom("")
      setDateTo("")
      fetchTransactions()
      return
    }

    // T074: Optimistic UI - set active state immediately (LS-06)
    const previousFilter = activeQuickFilter
    const previousDateFrom = dateFrom
    const previousDateTo = dateTo
    setActiveQuickFilter(filterType)
    setQuickFilterError(false)

    // T071: Get date range using utility
    const range = getDateRange(filterType)
    const formattedFrom = format(range.start, "yyyy-MM-dd")
    const formattedTo = format(range.end, "yyyy-MM-dd")

    setDateFrom(formattedFrom)
    setDateTo(formattedTo)

    // T079: Different filter clicked - replace (not additive) (EC-19)
    setStatus("")
    setUserId("")
    setTill("")

    // T073: 300ms debounce on filter clicks (NFR-P04)
    debounceRef.current = setTimeout(async () => {
      setIsQuickFilterLoading(true)
      try {
        const params = new URLSearchParams()
        params.append("dateFrom", formattedFrom)
        params.append("dateTo", formattedTo)

        const res = await fetch(`/api/transactions?${params}`)
        if (res.ok) {
          setTransactions(await res.json())
        } else {
          throw new Error("Failed to fetch")
        }
      } catch {
        // T076: Revert button state on filter failure (LS-08, NFR-E04)
        setActiveQuickFilter(previousFilter)
        setDateFrom(previousDateFrom)
        setDateTo(previousDateTo)
        setQuickFilterError(true)
      } finally {
        setIsQuickFilterLoading(false)
      }
    }, 300)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Heatmap color scale
  function getHeatmapColor(transactions: number, max: number): string {
    if (transactions === 0) return "bg-muted"
    const intensity = transactions / max
    if (intensity > 0.75) return "bg-green-500 text-white"
    if (intensity > 0.5) return "bg-green-400"
    if (intensity > 0.25) return "bg-green-300"
    if (intensity > 0.1) return "bg-green-200"
    return "bg-green-100"
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl md:text-2xl font-bold">Transaction History</h1>
        <Button variant="outline" onClick={() => { fetchTodayData(); fetchHeatmapData(); fetchTransactions(); }}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Today Summary Card */}
      {todayData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="col-span-2 sm:col-span-1 bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-primary">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm font-medium">Today</span>
              </div>
              <p className="text-xl md:text-2xl font-bold" data-testid="today-revenue">{fmtCurrency(todayData.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">{todayData.transactions} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <TrendingUp className="h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{fmtCurrency(todayData.avgTicket)}</p>
              <p className="text-xs text-muted-foreground">Avg Ticket</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <Flame className="h-4 w-4 text-orange-500 mb-1" />
              <p className="text-lg font-bold">{todayData.peakHour.label}</p>
              <p className="text-xs text-muted-foreground">Peak Hour ({todayData.peakHour.transactions} tx)</p>
            </CardContent>
          </Card>
          <Card className="col-span-2">
            <CardContent className="pt-4">
              <Clock className="h-4 w-4 text-muted-foreground mb-1" />
              <div className="flex flex-wrap gap-4">
                {todayData.daypartBreakdown.map((dp) => (
                  <div key={dp.daypart} className="text-center">
                    <p className="text-sm font-medium">{fmtCurrency(dp.total)}</p>
                    <p className="text-xs text-muted-foreground">{dp.daypart}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Transaction List</TabsTrigger>
          <TabsTrigger value="heatmap">Peak Hours Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* T069-T080: Enhanced Quick Filters with toggle, active state, and accessibility */}
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Quick date filters"
          >
            {quickFilterOptions.map((filterType) => (
              <Button
                key={filterType}
                // T072: Visual active state indication (variant="default" vs "outline")
                variant={activeQuickFilter === filterType ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuickFilterClick(filterType)}
                disabled={isQuickFilterLoading}
                // T080: Focus indicators handled by default Tailwind focus-visible
                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-pressed={activeQuickFilter === filterType}
                aria-label={`Filter by ${formatDateRangeLabel(filterType)}`}
              >
                {filterType}
              </Button>
            ))}
            {/* Show clear button when filter is active */}
            {activeQuickFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                Clear
              </Button>
            )}
          </div>

          {/* T075: Skeleton loader while filtering (LS-07) */}
          {isQuickFilterLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="1">Completed</SelectItem>
                      <SelectItem value="0">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cashier</Label>
                  <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.fullname}
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

                <div className="space-y-2">
                  <Label>Till</Label>
                  <Input
                    type="number"
                    placeholder="All"
                    value={till}
                    onChange={(e) => setTill(e.target.value)}
                  />
                </div>

                <div className="flex items-end gap-2">
                  <Button onClick={handleSearch} disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? "..." : "Search"}
                  </Button>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear
                  </Button>
                </div>

                {/* 003-transaction-fixes: Include voided filter */}
                <div className="flex items-center gap-2 col-span-full">
                  <Checkbox
                    id="includeVoided"
                    checked={includeVoided}
                    onCheckedChange={(checked) => setIncludeVoided(checked === true)}
                  />
                  <Label htmlFor="includeVoided" className="text-sm cursor-pointer">
                    Include voided transactions
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Cashier</TableHead>
                  <TableHead className="hidden sm:table-cell">Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    data-testid={`transaction-row-${tx.id}`}
                    className={tx.isVoided ? "opacity-60" : ""}
                  >
                    <TableCell className="font-mono">{tx.orderNumber}</TableCell>
                    <TableCell>
                      <div>{format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}</div>
                      {/* 003-transaction-fixes: Show void timestamp for voided transactions */}
                      {tx.isVoided && tx.voidedAt && (
                        <div className="text-xs text-destructive">
                          Voided: {format(new Date(tx.voidedAt), "MMM d, h:mm a")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{tx.customer?.name || "Walk-in"}</TableCell>
                    <TableCell className="hidden md:table-cell">{tx.user?.fullname || "Unknown"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {(() => {
                        const payment = formatPaymentDisplay(tx)
                        return (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span>{payment.label}</span>
                              {payment.status === "pending" && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] px-1 py-0">
                                  Pending
                                </Badge>
                              )}
                            </div>
                            {payment.detail && (
                              <div className="text-xs text-muted-foreground">{payment.detail}</div>
                            )}
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${tx.isVoided ? "line-through text-muted-foreground" : ""}`}
                      data-testid="transaction-total"
                    >
                      {fmtCurrency(tx.total)}
                    </TableCell>
                    <TableCell>
                      {tx.isVoided ? (
                        <Badge variant="destructive">Voided</Badge>
                      ) : (
                        getStatusBadge(tx)
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`view-transaction-${tx.id}`}
                        onClick={() => setViewTransaction(tx)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* T077: Zero results empty state with suggestion (EC-17) */}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      {loading || isQuickFilterLoading ? (
                        <span className="text-muted-foreground">Loading...</span>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-muted-foreground">No transactions found</p>
                          {activeQuickFilter && (
                            <p className="text-sm text-muted-foreground/70">
                              No transactions for {formatDateRangeLabel(activeQuickFilter)}.{" "}
                              <button
                                onClick={clearFilters}
                                className="text-primary underline underline-offset-2 hover:text-primary/80"
                              >
                                Try a different date range
                              </button>
                            </p>
                          )}
                          {!activeQuickFilter && (dateFrom || dateTo || status || userId || till) && (
                            <p className="text-sm text-muted-foreground/70">
                              Try adjusting your filters or{" "}
                              <button
                                onClick={clearFilters}
                                className="text-primary underline underline-offset-2 hover:text-primary/80"
                              >
                                clear all filters
                              </button>
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="heatmap">
          {heatmapData && (
            <Card>
              <CardHeader>
                <CardTitle>Peak Hours (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Hour labels */}
                    <div className="flex">
                      <div className="w-12" />
                      {hours.map((h) => (
                        <div key={h} className="w-8 text-center text-xs text-muted-foreground">
                          {h}
                        </div>
                      ))}
                    </div>

                    {/* Grid */}
                    {dayNames.map((dayName, dayIndex) => (
                      <div key={dayName} className="flex items-center">
                        <div className="w-12 text-xs text-muted-foreground">{dayName}</div>
                        {hours.map((hour) => {
                          const cell = heatmapData.data.find(
                            (d) => d.day === dayIndex && d.hour === hour
                          )
                          return (
                            <div
                              key={`${dayIndex}-${hour}`}
                              className={`w-8 h-8 m-0.5 rounded text-[10px] flex items-center justify-center ${getHeatmapColor(
                                cell?.transactions || 0,
                                heatmapData.maxTransactions
                              )}`}
                              title={`${dayName} ${hour}:00 - ${cell?.transactions || 0} transactions, ${fmtCurrency(cell?.revenue || 0)}`}
                            >
                              {(cell?.transactions || 0) > 0 ? cell?.transactions : ""}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Peak times summary */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Peak Times</h4>
                  <div className="flex flex-wrap gap-2">
                    {heatmapData.peakTimes.slice(0, 5).map((peak, i) => (
                      <Badge key={i} variant="secondary">
                        {peak.dayName} {peak.hour}:00 ({peak.transactions} tx)
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-muted" /> None
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-green-100" /> Low
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-green-300" /> Medium
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded bg-green-500" /> High
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{viewTransaction?.orderNumber}</DialogTitle>
          </DialogHeader>
          {viewTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Date:</div>
                <div>
                  {format(new Date(viewTransaction.createdAt), "MMM d, yyyy h:mm a")}
                </div>
                <div className="text-muted-foreground">Customer:</div>
                <div>{viewTransaction.customer?.name || "Walk-in"}</div>
                <div className="text-muted-foreground">Cashier:</div>
                <div>{viewTransaction.user?.fullname || "Unknown"}</div>
                <div className="text-muted-foreground">Till:</div>
                <div>{viewTransaction.tillNumber}</div>
                <div className="text-muted-foreground">Payment:</div>
                <div className="flex items-center gap-2">
                  <span>{viewTransaction.paymentType || "-"}</span>
                  {viewTransaction.paymentStatus === "pending" && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
                {/* GCash reference */}
                {viewTransaction.paymentType === "GCash" && viewTransaction.paymentInfo && (
                  <>
                    <div className="text-muted-foreground">GCash Ref:</div>
                    <div className="font-mono text-xs">{viewTransaction.paymentInfo}</div>
                  </>
                )}
                {/* Split payment breakdown */}
                {viewTransaction.paymentType === "Split" && viewTransaction.paymentInfo && (
                  <>
                    <div className="text-muted-foreground">Split:</div>
                    <div className="text-xs">
                      {(() => {
                        try {
                          const split = JSON.parse(viewTransaction.paymentInfo)
                          return split.components?.map((c: { method: string; amount: number; reference?: string }, i: number) => (
                            <div key={i}>
                              {c.method}: {fmtCurrency(c.amount)}
                              {c.reference && <span className="text-muted-foreground ml-1">({c.reference})</span>}
                            </div>
                          ))
                        } catch {
                          return viewTransaction.paymentInfo
                        }
                      })()}
                    </div>
                  </>
                )}
                {viewTransaction.refNumber && (
                  <>
                    <div className="text-muted-foreground">Ref #:</div>
                    <div>{viewTransaction.refNumber}</div>
                  </>
                )}
              </div>

              <div className="border rounded p-3 space-y-2">
                <div className="font-medium">Items</div>
                {viewTransaction.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    <span>{fmtCurrency(item.price)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{fmtCurrency(viewTransaction.subtotal)}</span>
                </div>
                {viewTransaction.discount &&
                  parseFloat(viewTransaction.discount) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span>-{fmtCurrency(viewTransaction.discount)}</span>
                    </div>
                  )}
                {viewTransaction.taxAmount &&
                  parseFloat(viewTransaction.taxAmount) > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{fmtCurrency(viewTransaction.taxAmount)}</span>
                    </div>
                  )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span>{fmtCurrency(viewTransaction.total)}</span>
                </div>
                {viewTransaction.paidAmount && (
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span>{fmtCurrency(viewTransaction.paidAmount)}</span>
                  </div>
                )}
                {viewTransaction.changeAmount && (
                  <div className="flex justify-between">
                    <span>Change</span>
                    <span>{fmtCurrency(viewTransaction.changeAmount)}</span>
                  </div>
                )}
              </div>

              {/* 003-transaction-fixes: Void info section */}
              {viewTransaction.isVoided && (
                <div className="bg-destructive/10 border border-destructive/30 rounded p-3 space-y-1">
                  <div className="flex items-center gap-2 text-destructive font-medium">
                    <Ban className="h-4 w-4" />
                    Transaction Voided
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Reason: {viewTransaction.voidReason}</p>
                    <p>By: {viewTransaction.voidedByName}</p>
                    {viewTransaction.voidedAt && (
                      <p>On: {format(new Date(viewTransaction.voidedAt), "MMM d, yyyy h:mm a")}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 003-transaction-fixes: Void button */}
              {!viewTransaction.isVoided && session?.user?.permVoid && (
                <div className="pt-2 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    data-testid="void-button"
                    onClick={() => setShowVoidModal(true)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Void Transaction
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 003-transaction-fixes: Void Confirmation Modal */}
      <Dialog open={showVoidModal} onOpenChange={(open) => {
        if (!open) {
          setShowVoidModal(false)
          setVoidReason("")
          setCustomVoidReason("")
          setVoidError(null)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Void Transaction #{viewTransaction?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The transaction will be marked as voided and excluded from revenue calculations.
            </p>

            <div className="space-y-2">
              <Label>Reason for voiding</Label>
              <Select
                value={voidReason}
                onValueChange={(value) => {
                  setVoidReason(value)
                  setVoidError(null)
                }}
              >
                <SelectTrigger data-testid="void-reason-select">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {VALID_VOID_REASONS.map((reason) => (
                    <SelectItem
                      key={reason}
                      value={reason}
                      data-testid={`void-reason-${reason.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {voidReason === "Other" && (
              <div className="space-y-2">
                <Label>Custom reason</Label>
                <Textarea
                  placeholder="Please describe the reason..."
                  value={customVoidReason}
                  onChange={(e) => {
                    setCustomVoidReason(e.target.value)
                    setVoidError(null)
                  }}
                />
              </div>
            )}

            {voidError && (
              <div className="text-sm text-destructive bg-destructive/10 rounded p-2">
                {voidError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowVoidModal(false)}
                disabled={voidLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                data-testid="confirm-void-button"
                onClick={handleVoidTransaction}
                disabled={voidLoading}
              >
                {voidLoading ? "Voiding..." : "Confirm Void"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
