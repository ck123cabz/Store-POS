"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { getDateRange, type DateRangeType } from "@/lib/date-ranges"
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
import { Card, CardContent } from "@/components/ui/card"
import { Search, Ban, AlertTriangle, AlertCircle, ChevronsUpDown, ReceiptText } from "lucide-react"
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

// Epic 4 shared components
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { SummaryCard, SummaryCardGrid } from "@/components/ui/summary-card"
import { FilterPills } from "@/components/ui/filter-pills"
import { StatusDot } from "@/components/ui/status-dot"

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

// Quick filter options matching FilterPills format
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

  // Quick filter handler — simplified for FilterPills (single-click, no debounce needed)
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
      },
      priority: 1,
    },
    {
      id: "status",
      header: "Status",
      cell: (tx) => {
        if (tx.isVoided) return <StatusDot variant="critical" label="Voided" />
        if (tx.status === 1) return <StatusDot variant="ok" label="Completed" />
        if (tx.refNumber) return <StatusDot variant="info" label="On Hold" />
        return <StatusDot variant="warning" label="Pending" />
      },
      priority: 0,
      align: "center",
    },
  ]

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
      <FilterPills
        options={quickFilterOptions}
        value={activeQuickFilter}
        onChange={handleQuickFilterChange}
        ariaLabel="Quick date filters"
      />

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
        emptyTitle="No transactions found"
        emptyDescription={
          activeQuickFilter || dateFrom || dateTo || status || userId || till
            ? "Try adjusting your filters or clearing them."
            : "Transactions will appear here once sales are recorded."
        }
        emptyAction={
          (activeQuickFilter || dateFrom || dateTo || status || userId || till) ? (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : undefined
        }
      />

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

              {/* Void info section */}
              {viewTransaction.isVoided && (
                <Alert variant="destructive">
                  <Ban className="h-4 w-4" />
                  <AlertTitle>Transaction Voided</AlertTitle>
                  <AlertDescription>
                    <p>Reason: {viewTransaction.voidReason}</p>
                    <p>By: {viewTransaction.voidedByName}</p>
                    {viewTransaction.voidedAt && (
                      <p>On: {format(new Date(viewTransaction.voidedAt), "MMM d, yyyy h:mm a")}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Void button */}
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

      {/* Void Confirmation Modal */}
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
