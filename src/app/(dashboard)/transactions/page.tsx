"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
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
import { Card, CardContent } from "@/components/ui/card"
import { Eye, Search } from "lucide-react"

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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null)

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
      if (status) params.append("status", status)
      if (userId) params.append("userId", userId)
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

  useEffect(() => {
    fetchTransactions()
    fetchUsers()
  }, [fetchTransactions, fetchUsers])

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

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Transaction History</h1>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                {loading ? "Loading..." : "Search"}
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Cashier</TableHead>
            <TableHead>Payment</TableHead>
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
              <TableCell>{tx.customer?.name || "Walk-in"}</TableCell>
              <TableCell>{tx.user?.fullname || "Unknown"}</TableCell>
              <TableCell>{tx.paymentType || "—"}</TableCell>
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
                <div>{viewTransaction.paymentType || "—"}</div>
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
