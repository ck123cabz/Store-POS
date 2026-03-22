"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getDateRange, DATE_RANGE_OPTIONS, type DateRangeType } from "@/lib/date-ranges"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Ban, AlertTriangle, AlertCircle, ChevronsUpDown, ReceiptText, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatCurrency } from "@/lib/format-currency"
import { useSettings } from "@/hooks/use-settings"
import { useSession } from "next-auth/react"
import { VALID_VOID_REASONS } from "@/lib/void-constants"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Epic 4 shared components
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { SummaryCard, SummaryCardGrid } from "@/components/ui/summary-card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DateRangePicker, type DateRangePreset } from "@/components/ui/date-range-picker"
import { StatusDot } from "@/components/ui/status-dot"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

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

// Quick filter options for ToggleGroup
const quickFilterOptions: { label: string; value: string }[] = [
  { label: "Today", value: "Today" },
  { label: "Yesterday", value: "Yesterday" },
  { label: "This Week", value: "This Week" },
  { label: "This Month", value: "This Month" },
  { label: "All", value: "All" },
]

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null)
  const [todayData, setTodayData] = useState<TodayData | null>(null)

  const isMobile = useIsMobile()

  // Use settings for currency symbol
  const { currencySymbol } = useSettings()

  // Session for void permission
  const { data: session } = useSession()

  // Void modal state
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [voidReason, setVoidReason] = useState("")
  const [customVoidReason, setCustomVoidReason] = useState("")
  const [voidError, setVoidError] = useState<string | null>(null)
  const [voidLoading, setVoidLoading] = useState(false)

  // GCash confirm/cancel state
  const [gcashActionLoading, setGcashActionLoading] = useState<"confirm" | "cancel" | null>(null)

  // Filters
  const [status, setStatus] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [till, setTill] = useState<string>("")
  const [includeVoided, setIncludeVoided] = useState(false)

  // Quick filter state
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status && status !== "all") params.append("status", status)
      if (userId && userId !== "all") params.append("userId", userId)
      if (dateFrom) params.append("dateFrom", dateFrom)
      if (dateTo) params.append("dateTo", dateTo)
      if (till) params.append("till", till)
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

  useEffect(() => {
    fetchTransactions()
    fetchUsers()
    fetchTodayData()
  }, [fetchTransactions, fetchUsers, fetchTodayData])

  // GCash confirm/cancel handlers
  const handleGcashConfirm = async (txId: number) => {
    setGcashActionLoading("confirm")
    try {
      const res = await fetch(`/api/transactions/${txId}/confirm`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to confirm")
      }
      const updated = await res.json()
      toast.success("GCash payment confirmed")
      setViewTransaction((prev) => prev ? { ...prev, paymentStatus: updated.paymentStatus } : prev)
      fetchTransactions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to confirm payment")
    } finally {
      setGcashActionLoading(null)
    }
  }

  const handleGcashCancel = async (txId: number) => {
    setGcashActionLoading("cancel")
    try {
      const res = await fetch(`/api/transactions/${txId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "GCash payment not received" }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to cancel")
      }
      toast.success("GCash payment cancelled — stock restored")
      setViewTransaction(null)
      fetchTransactions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel payment")
    } finally {
      setGcashActionLoading(null)
    }
  }

  // Helper to format currency with settings symbol
  const fmtCurrency = (value: string | number | null | undefined) =>
    formatCurrency(value, currencySymbol)

  // Format payment display with details
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

  // Handle void transaction
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

      toast.success("Transaction voided", {
        description: "Stock and ingredients have been restored.",
      })

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

  // DateRangePicker presets derived from lib/date-ranges
  const datePresets: DateRangePreset[] = DATE_RANGE_OPTIONS.map((label) => ({
    label,
    getValue: () => {
      const range = getDateRange(label)
      return { from: range.start, to: range.end }
    },
  }))

  // Quick filter handler
  function handleQuickFilterChange(value: string | null) {
    if (!value) {
      // Toggled off
      setActiveQuickFilter(null)
      setDateFrom("")
      setDateTo("")
      return
    }

    setActiveQuickFilter(value)

    // "All" clears date filters to show everything
    if (value === "All") {
      setDateFrom("")
      setDateTo("")
      setStatus("")
      setUserId("")
      setTill("")
      return
    }

    const filterType = value as DateRangeType

    // Get date range using utility
    const range = getDateRange(filterType)
    const formattedFrom = format(range.start, "yyyy-MM-dd")
    const formattedTo = format(range.end, "yyyy-MM-dd")

    setDateFrom(formattedFrom)
    setDateTo(formattedTo)

    // Clear advanced filters when quick filter is applied
    setStatus("")
    setUserId("")
    setTill("")
  }

  // DataTable column definitions
  const columns: DataTableColumn<Transaction>[] = [
    {
      id: "orderNumber",
      header: "Order #",
      cell: (tx) => (
        <span className="font-mono tabular-nums">{tx.orderNumber}</span>
      ),
      priority: 0,
      sortable: true,
    },
    {
      id: "time",
      header: "Time",
      cell: (tx) => (
        <div>
          <div>{format(new Date(tx.createdAt), "MMM d, h:mm a")}</div>
          {tx.isVoided && tx.voidedAt && (
            <div className="text-xs text-destructive">
              Voided: {format(new Date(tx.voidedAt), "MMM d, h:mm a")}
            </div>
          )}
        </div>
      ),
      priority: 1,
      sortable: true,
    },
    {
      id: "items",
      header: "Items",
      cell: (tx) => tx.items.length,
      priority: 2,
      align: "center",
    },
    {
      id: "total",
      header: "Total",
      cell: (tx) => (
        <span
          className={cn(
            "font-mono tabular-nums",
            tx.isVoided && "line-through text-muted-foreground"
          )}
          data-testid="transaction-total"
        >
          {fmtCurrency(tx.total)}
        </span>
      ),
      priority: 0,
      align: "right",
      sortable: true,
    },
    {
      id: "payment",
      header: "Payment",
      cell: (tx) => {
        const payment = formatPaymentDisplay(tx)
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span>{payment.label}</span>
              {payment.status === "pending" && (
                <Badge variant="outline" className="text-status-warning border-status-warning/30 text-[10px] px-1 py-0">
                  Pending
                </Badge>
              )}
            </div>
            {payment.detail && (
              <div className="text-xs text-muted-foreground">{payment.detail}</div>
            )}
          </div>
        )
      },
      priority: 1,
    },
    {
      id: "status",
      header: "Status",
      cell: (tx) => {
        if (tx.isVoided) return <StatusDot variant="critical" label="Voided" />
        if (tx.paymentStatus === "cancelled") return <StatusDot variant="critical" label="Cancelled" />
        if (tx.paymentStatus === "pending") return <StatusDot variant="warning" label="GCash Pending" />
        if (tx.status === 1) return <StatusDot variant="ok" label="Completed" />
        if (tx.refNumber) return <StatusDot variant="info" label="On Hold" />
        return <StatusDot variant="warning" label="Pending" />
      },
      priority: 0,
      align: "center",
    },
  ]

  // Helper: get status variant and label for a transaction
  function getStatusInfo(tx: Transaction): { variant: "ok" | "warning" | "critical" | "info"; label: string } {
    if (tx.isVoided) return { variant: "critical", label: "Voided" }
    if (tx.paymentStatus === "cancelled") return { variant: "critical", label: "Cancelled" }
    if (tx.paymentStatus === "pending") return { variant: "warning", label: "GCash Pending" }
    if (tx.status === 1) return { variant: "ok", label: "Completed" }
    if (tx.refNumber) return { variant: "info", label: "On Hold" }
    return { variant: "warning", label: "Pending" }
  }

  // Mobile card renderer for DataTable
  function renderTransactionCard(tx: Transaction) {
    const statusInfo = getStatusInfo(tx)
    return (
      <Card className={cn("py-3 gap-2", tx.isVoided && "opacity-60")}>
        <CardContent className="px-4 py-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums font-semibold">#{tx.orderNumber}</span>
              <StatusDot variant={statusInfo.variant} label={statusInfo.label} />
            </div>
            <span
              className={cn(
                "font-mono tabular-nums font-semibold",
                tx.isVoided && "line-through text-muted-foreground"
              )}
            >
              {fmtCurrency(tx.total)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-sm text-muted-foreground truncate max-w-[60%]">
              {tx.customer?.name || "Walk-in"}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(tx.createdAt), "MMM d, h:mm a")}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Transaction detail content (shared between Dialog and Sheet)
  function renderTransactionDetail(tx: Transaction) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Date:</div>
          <div>
            {format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}
          </div>
          <div className="text-muted-foreground">Customer:</div>
          <div>{tx.customer?.name || "Walk-in"}</div>
          <div className="text-muted-foreground">Cashier:</div>
          <div className="flex items-center gap-2">
            {tx.user?.fullname && (
              <Avatar size="sm">
                <AvatarFallback>
                  {tx.user.fullname
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            )}
            <span>{tx.user?.fullname || "Unknown"}</span>
          </div>
          <div className="text-muted-foreground">Till:</div>
          <div>{tx.tillNumber}</div>
          <div className="text-muted-foreground">Payment:</div>
          <div className="flex items-center gap-2">
            <span>{tx.paymentType || "-"}</span>
            {tx.paymentStatus === "pending" && (
              <Badge variant="outline" className="text-status-warning border-status-warning/30 text-xs">
                Pending
              </Badge>
            )}
            {tx.paymentStatus === "confirmed" && (
              <Badge variant="outline" className="text-status-ok border-status-ok/30 text-xs">
                Confirmed
              </Badge>
            )}
            {tx.paymentStatus === "cancelled" && (
              <Badge variant="outline" className="text-status-critical border-status-critical/30 text-xs">
                Cancelled
              </Badge>
            )}
          </div>
          {/* GCash proof photo */}
          {tx.paymentType === "GCash" && tx.gcashPhotoPath && (
            <>
              <div className="text-muted-foreground">Proof:</div>
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tx.gcashPhotoPath}
                  alt="GCash payment proof"
                  className="rounded border max-h-32 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(tx.gcashPhotoPath!, "_blank")}
                />
              </div>
            </>
          )}
          {/* GCash reference (for legacy/non-photo entries) */}
          {tx.paymentType === "GCash" && tx.paymentInfo && !tx.paymentInfo.startsWith("photo:") && (
            <>
              <div className="text-muted-foreground">Ref:</div>
              <div className="font-mono text-xs truncate max-w-48">{tx.paymentInfo}</div>
            </>
          )}
          {/* Split payment breakdown */}
          {tx.paymentType === "Split" && tx.paymentInfo && (
            <>
              <div className="text-muted-foreground">Split:</div>
              <div className="text-xs">
                {(() => {
                  try {
                    const split = JSON.parse(tx.paymentInfo)
                    return split.components?.map((c: { method: string; amount: number; reference?: string }, i: number) => (
                      <div key={i}>
                        {c.method}: {fmtCurrency(c.amount)}
                        {c.reference && <span className="text-muted-foreground ml-1">({c.reference})</span>}
                      </div>
                    ))
                  } catch {
                    return tx.paymentInfo
                  }
                })()}
              </div>
            </>
          )}
          {tx.refNumber && (
            <>
              <div className="text-muted-foreground">Ref #:</div>
              <div>{tx.refNumber}</div>
            </>
          )}
        </div>

        <div className="border rounded p-3 space-y-2">
          <div className="font-medium">Items</div>
          {tx.items.map((item) => (
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
            <span>{fmtCurrency(tx.subtotal)}</span>
          </div>
          {tx.discount &&
            parseFloat(tx.discount) > 0 && (
              <div className="flex justify-between text-status-critical">
                <span>Discount</span>
                <span>-{fmtCurrency(tx.discount)}</span>
              </div>
            )}
          {tx.taxAmount &&
            parseFloat(tx.taxAmount) > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{fmtCurrency(tx.taxAmount)}</span>
              </div>
            )}
          <div className="flex justify-between font-bold text-base pt-1">
            <span>Total</span>
            <span>{fmtCurrency(tx.total)}</span>
          </div>
          {tx.paidAmount && (
            <div className="flex justify-between">
              <span>Paid</span>
              <span>{fmtCurrency(tx.paidAmount)}</span>
            </div>
          )}
          {tx.changeAmount && (
            <div className="flex justify-between">
              <span>Change</span>
              <span>{fmtCurrency(tx.changeAmount)}</span>
            </div>
          )}
        </div>

        {/* GCash confirm/cancel actions */}
        {tx.paymentType === "GCash" && tx.paymentStatus === "pending" && !tx.isVoided && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 min-h-[44px]"
              disabled={gcashActionLoading !== null}
              onClick={() => handleGcashConfirm(tx.id)}
            >
              {gcashActionLoading === "confirm" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirm Payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-h-[44px] text-status-critical hover:text-status-critical"
              disabled={gcashActionLoading !== null}
              onClick={() => handleGcashCancel(tx.id)}
            >
              {gcashActionLoading === "cancel" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Cancel Payment
            </Button>
          </div>
        )}

        {/* Void info section */}
        {tx.isVoided && (
          <Alert variant="destructive">
            <Ban className="h-4 w-4" />
            <AlertTitle>Transaction Voided</AlertTitle>
            <AlertDescription>
              <p>Reason: {tx.voidReason}</p>
              <p>By: {tx.voidedByName}</p>
              {tx.voidedAt && (
                <p>On: {format(new Date(tx.voidedAt), "MMM d, yyyy h:mm a")}</p>
              )}
              <p className="text-xs mt-1 opacity-75">Stock and ingredients were restored.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Void button */}
        {!tx.isVoided && session?.user?.permVoid && (
          <div className="pt-2 border-t">
            <Button
              variant="destructive"
              size="sm"
              className="min-h-[44px]"
              data-testid="void-button"
              onClick={() => setShowVoidModal(true)}
            >
              <Ban className="h-4 w-4 mr-2" />
              Void Transaction
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Transactions</h1>

      {/* Summary Cards */}
      {todayData && (
        <SummaryCardGrid>
          <SummaryCard
            label="Today's Revenue"
            value={fmtCurrency(todayData.totalRevenue)}
            data-testid="today-revenue"
          />
          <SummaryCard
            label="Transactions"
            value={todayData.transactions.toString()}
          />
          <SummaryCard
            label="Avg Order"
            value={fmtCurrency(todayData.avgTicket)}
          />
          <SummaryCard
            label="Peak Hour"
            value={todayData.peakHour.label}
          />
        </SummaryCardGrid>
      )}

      {/* Quick Filters */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={activeQuickFilter || ""}
          onValueChange={(v) => handleQuickFilterChange(v || null)}
          aria-label="Quick date filters"
          className="min-h-[44px]"
        >
          {quickFilterOptions.map((o) => (
            <ToggleGroupItem key={o.value} value={o.value} className="min-h-[44px] md:min-h-0">{o.label}</ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Advanced Filters */}
      <Collapsible>
        <Card>
          <CardContent className="pt-6">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between mb-4">
                <span className="text-sm font-medium">Advanced Filters</span>
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger aria-label="Filter by status">
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
                    <SelectTrigger aria-label="Filter by cashier">
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

                <div className="space-y-2 col-span-2">
                  <Label>Date Range</Label>
                  <DateRangePicker
                    from={dateFrom ? new Date(dateFrom + "T00:00:00") : undefined}
                    to={dateTo ? new Date(dateTo + "T00:00:00") : undefined}
                    onChange={({ from, to }) => {
                      setDateFrom(from ? format(from, "yyyy-MM-dd") : "")
                      setDateTo(to ? format(to, "yyyy-MM-dd") : "")
                      setActiveQuickFilter(null)
                    }}
                    presets={datePresets}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-till">Till</Label>
                  <Input
                    id="filter-till"
                    type="number"
                    placeholder="All"
                    value={till}
                    onChange={(e) => setTill(e.target.value)}
                  />
                </div>

                <div className="flex items-end gap-2">
                  <Button onClick={handleSearch} disabled={loading} className="min-h-[44px] md:min-h-0">
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? "..." : "Search"}
                  </Button>
                  <Button variant="outline" onClick={clearFilters} className="min-h-[44px] md:min-h-0">
                    Clear
                  </Button>
                </div>

                {/* Include voided filter */}
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
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>

      {/* Transaction DataTable */}
      <DataTable
        columns={columns}
        data={transactions}
        rowKey={(tx) => tx.id}
        onRowClick={(tx) => setViewTransaction(tx)}
        loading={loading}
        pageSize={15}
        emptyIcon={<ReceiptText className="size-10" />}
        emptyTitle="No transactions yet"
        emptyDescription={
          activeQuickFilter || dateFrom || dateTo || status || userId || till
            ? "No transactions match your filters."
            : "Your first sale is going to feel great."
        }
        emptyAction={
          (activeQuickFilter || dateFrom || dateTo || status || userId || till) ? (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link href="/pos">Go to POS</Link>
            </Button>
          )
        }
        mobileCardRender={renderTransactionCard}
      />

      {/* Detail: Sheet on mobile, Dialog on desktop */}
      {isMobile ? (
        <Sheet open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
          <SheetContent side="right" className="w-full sm:max-w-full p-0">
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle>Order #{viewTransaction?.orderNumber}</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto flex-1 px-4 py-4">
              {viewTransaction && renderTransactionDetail(viewTransaction)}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Order #{viewTransaction?.orderNumber}</DialogTitle>
            </DialogHeader>
            {viewTransaction && renderTransactionDetail(viewTransaction)}
          </DialogContent>
        </Dialog>
      )}

      {/* Void Confirmation Modal */}
      <Dialog open={showVoidModal} onOpenChange={(open) => {
        if (!open) {
          setShowVoidModal(false)
          setVoidReason("")
          setCustomVoidReason("")
          setVoidError(null)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Void Transaction #{viewTransaction?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The transaction will be marked as voided, stock and ingredients will be restored, and it will be excluded from revenue calculations.
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
                <SelectTrigger data-testid="void-reason-select" aria-label="Reason for voiding">
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
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{voidError}</AlertDescription>
              </Alert>
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
