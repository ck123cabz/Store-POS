"use client"

import { useState, useEffect, useCallback } from "react"
import { format, subDays } from "date-fns"
import { Button } from "@/components/ui/button"
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
import { Eye, Search, TrendingUp, DollarSign, Clock, Flame, RefreshCw } from "lucide-react"

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
  createdAt: string
  tillNumber: number
  refNumber: string
  customer: { id: number; name: string } | null
  user: { id: number; fullname: string }
  items: TransactionItem[]
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

  // Filters
  const [status, setStatus] = useState<string>("")
  const [userId, setUserId] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [till, setTill] = useState<string>("")

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status && status !== "all") params.append("status", status)
      if (userId && userId !== "all") params.append("userId", userId)
      if (dateFrom) params.append("dateFrom", dateFrom)
      if (dateTo) params.append("dateTo", dateTo)
      if (till) params.append("till", till)

      const res = await fetch(`/api/transactions?${params}`)
      if (res.ok) {
        setTransactions(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setLoading(false)
    }
  }, [status, userId, dateFrom, dateTo, till])

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

  function formatCurrency(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "$0.00"
    const num = typeof value === "string" ? parseFloat(value) : value
    return `$${num.toFixed(2)}`
  }

  function handleSearch() {
    fetchTransactions()
  }

  function clearFilters() {
    setStatus("")
    setUserId("")
    setDateFrom("")
    setDateTo("")
    setTill("")
  }

  // Quick filter presets
  function setQuickFilter(preset: string) {
    const today = format(new Date(), "yyyy-MM-dd")
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd")
    const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd")

    clearFilters()

    switch (preset) {
      case "today":
        setDateFrom(today)
        setDateTo(today)
        break
      case "yesterday":
        setDateFrom(yesterday)
        setDateTo(yesterday)
        break
      case "week":
        setDateFrom(weekAgo)
        setDateTo(today)
        break
      case "completed":
        setStatus("1")
        break
      case "pending":
        setStatus("0")
        break
    }
  }

  // Heatmap color scale
  function getHeatmapColor(transactions: number, max: number): string {
    if (transactions === 0) return "bg-gray-100"
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
              <p className="text-xl md:text-2xl font-bold">{formatCurrency(todayData.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">{todayData.transactions} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <TrendingUp className="h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{formatCurrency(todayData.avgTicket)}</p>
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
                    <p className="text-sm font-medium">{formatCurrency(dp.total)}</p>
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
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickFilter("today")}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter("yesterday")}>
              Yesterday
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter("week")}>
              Last 7 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter("completed")}>
              Completed
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter("pending")}>
              Pending
            </Button>
          </div>

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
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono">{tx.orderNumber}</TableCell>
                    <TableCell>
                      {format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{tx.customer?.name || "Walk-in"}</TableCell>
                    <TableCell className="hidden md:table-cell">{tx.user?.fullname || "Unknown"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{tx.paymentType || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(tx.total)}
                    </TableCell>
                    <TableCell>{getStatusBadge(tx)}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setViewTransaction(tx)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {loading ? "Loading..." : "No transactions found"}
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
                              title={`${dayName} ${hour}:00 - ${cell?.transactions || 0} transactions, ${formatCurrency(cell?.revenue || 0)}`}
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
                    <div className="w-4 h-4 rounded bg-gray-100" /> None
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
                <div>{viewTransaction.paymentType || "-"}</div>
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
                    <span>{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(viewTransaction.subtotal)}</span>
                </div>
                {viewTransaction.discount &&
                  parseFloat(viewTransaction.discount) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(viewTransaction.discount)}</span>
                    </div>
                  )}
                {viewTransaction.taxAmount &&
                  parseFloat(viewTransaction.taxAmount) > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatCurrency(viewTransaction.taxAmount)}</span>
                    </div>
                  )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(viewTransaction.total)}</span>
                </div>
                {viewTransaction.paidAmount && (
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span>{formatCurrency(viewTransaction.paidAmount)}</span>
                  </div>
                )}
                {viewTransaction.changeAmount && (
                  <div className="flex justify-between">
                    <span>Change</span>
                    <span>{formatCurrency(viewTransaction.changeAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
